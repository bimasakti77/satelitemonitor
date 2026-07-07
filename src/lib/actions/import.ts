"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { recordServiceHistory } from "@/lib/service-history";
import type { ActionResult } from "./auth";
import type { IntegrationReadiness, Prisma, ServiceScope } from "@prisma/client";
import {
  buildImportTemplateRows,
  IMPORT_TEMPLATE_FILENAME,
  IMPORT_COLUMN_MAP,
  normalizeImportHeader,
} from "@/lib/import-template";

export interface ImportRow {
  rowNumber: number;
  kelompokLayanan: string;
  jenisLayanan: string;
  tahunPekerjaan: number;
  scope: ServiceScope;
  tipeLayananInternal?: string;
  sudahSuperApps: boolean;
  kesiapanIntegrasi: IntegrationReadiness;
  namaAplikasi?: string;
  detailAplikasi?: string;
  unitKerja?: string;
  ukeCode?: string;
  status: "new" | "update" | "duplicate" | "error";
  errors: string[];
  existingId?: string;
}

interface ImportUpdatedSnapshot {
  id: string;
  before: {
    kelompokLayanan: string;
    jenisLayanan: string;
    tahunPekerjaan: number;
    scope: ServiceScope;
    tipeLayananInternal: string | null;
    sudahSuperApps: boolean;
    kesiapanIntegrasi: IntegrationReadiness;
    namaAplikasi: string | null;
    detailAplikasi: string | null;
    ukeId: string | null;
    fungsi: { nama: string; sortOrder: number }[];
  };
}

interface ImportSnapshot {
  created: string[];
  updated: ImportUpdatedSnapshot[];
}

const COMMIT_BATCH_SIZE = 40;
const HISTORY_CHUNK_SIZE = 100;

type ServiceBefore = ImportUpdatedSnapshot["before"];

function toRollbackBefore(
  before: {
    kelompokLayanan: string;
    jenisLayanan: string;
    tahunPekerjaan: number;
    scope: ServiceScope;
    tipeLayananInternal: string | null;
    sudahSuperApps: boolean;
    kesiapanIntegrasi: IntegrationReadiness;
    namaAplikasi: string | null;
    detailAplikasi: string | null;
    ukeId: string | null;
    fungsi: { nama: string; sortOrder: number }[];
  }
): ImportUpdatedSnapshot["before"] {
  return {
    kelompokLayanan: before.kelompokLayanan,
    jenisLayanan: before.jenisLayanan,
    tahunPekerjaan: before.tahunPekerjaan,
    scope: before.scope,
    tipeLayananInternal: before.tipeLayananInternal,
    sudahSuperApps: before.sudahSuperApps,
    kesiapanIntegrasi: before.kesiapanIntegrasi,
    namaAplikasi: before.namaAplikasi,
    detailAplikasi: before.detailAplikasi,
    ukeId: before.ukeId,
    fungsi: before.fungsi.map((f) => ({ nama: f.nama, sortOrder: f.sortOrder })),
  };
}

async function flushHistoryBatch(
  records: Prisma.ServiceHistoryCreateManyInput[]
) {
  for (let i = 0; i < records.length; i += HISTORY_CHUNK_SIZE) {
    await prisma.serviceHistory.createMany({
      data: records.slice(i, i + HISTORY_CHUNK_SIZE),
    });
  }
}

const COLUMN_MAP = IMPORT_COLUMN_MAP as Record<string, keyof ImportRow>;

function normalizeHeader(h: string): string {
  return normalizeImportHeader(h);
}

function parseBool(val: unknown): boolean {
  const s = String(val ?? "").toLowerCase().trim();
  return ["ya", "yes", "true", "1", "sudah"].includes(s);
}

function parseScope(val: unknown): ServiceScope {
  const s = String(val ?? "").toUpperCase().trim();
  return s.startsWith("INT") || s.includes("INTERNAL") ? "INTERNAL" : "EKSTERNAL";
}

function parseIntegration(val: unknown): IntegrationReadiness {
  const s = String(val ?? "").toUpperCase().trim();
  if (s.includes("Q1")) return "Q1";
  if (s.includes("Q2")) return "Q2";
  if (s.includes("Q3")) return "Q3";
  return "NOT_READY";
}

function cleanText(val: unknown): string | undefined {
  const s = String(val ?? "").trim();
  if (!s || s === "(tidak ada)") return undefined;
  return s;
}

function resolveUke(
  row: Partial<ImportRow>,
  ukeByCode: Map<string, { id: string }>,
  ukeByName: Map<string, { id: string }>
) {
  if (row.ukeCode) {
    const byCode = ukeByCode.get(row.ukeCode.toLowerCase());
    if (byCode) return byCode;
  }
  if (row.unitKerja) {
    const key = row.unitKerja.toLowerCase();
    const byName = ukeByName.get(key);
    if (byName) return byName;
    for (const [name, uke] of ukeByName) {
      if (key.includes(name) || name.includes(key)) return uke;
    }
  }
  return undefined;
}

function rowToServiceData(row: ImportRow, ukeId: string | null) {
  return {
    kelompokLayanan: row.kelompokLayanan,
    jenisLayanan: row.jenisLayanan,
    tahunPekerjaan: row.tahunPekerjaan,
    scope: row.scope,
    tipeLayananInternal:
      row.scope === "INTERNAL" ? row.tipeLayananInternal ?? null : null,
    sudahSuperApps: row.sudahSuperApps,
    kesiapanIntegrasi: row.kesiapanIntegrasi,
    namaAplikasi: row.namaAplikasi,
    detailAplikasi: row.detailAplikasi,
    ukeId,
  };
}

/** Uniqueness: Kelompok Layanan + Jenis Layanan + Tahun Pekerjaan + Tipe Layanan (Internal/Eksternal) */
function serviceDuplicateKey(
  kelompokLayanan: string,
  jenisLayanan: string,
  tahunPekerjaan: number,
  scope: ServiceScope
): string {
  return `${kelompokLayanan.toLowerCase().trim()}|${jenisLayanan.toLowerCase().trim()}|${tahunPekerjaan}|${scope}`;
}

export async function getLatestCommittedImportId(): Promise<string | null> {
  const latest = await prisma.import.findFirst({
    where: { status: "COMMITTED" },
    orderBy: [{ committedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  return latest?.id ?? null;
}

export async function previewImport(
  _prev: ActionResult<{ importId: string; rows: ImportRow[] }>,
  formData: FormData
): Promise<ActionResult<{ importId: string; rows: ImportRow[] }>> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "File wajib diunggah" };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const [ukes, existingServices] = await Promise.all([
    prisma.uke.findMany(),
    prisma.service.findMany({ where: { isDeleted: false } }),
  ]);

  const ukeByCode = new Map(ukes.map((u) => [u.code.toLowerCase(), u]));
  const ukeByName = new Map(ukes.map((u) => [u.name.toLowerCase(), u]));
  const serviceByKey = new Map(
    existingServices.map((s) => [
      serviceDuplicateKey(s.kelompokLayanan, s.jenisLayanan, s.tahunPekerjaan, s.scope),
      s,
    ])
  );

  const rows: ImportRow[] = [];
  const seenKeys = new Set<string>();

  raw.forEach((row, index) => {
    const mapped: Partial<ImportRow> = {
      rowNumber: index + 2,
      errors: [],
      status: "new",
    };

    for (const [key, val] of Object.entries(row)) {
      const field = COLUMN_MAP[normalizeHeader(key)];
      if (!field) continue;

      if (field === "tahunPekerjaan") {
        mapped.tahunPekerjaan = Number(val) || new Date().getFullYear();
      } else if (field === "sudahSuperApps") {
        mapped.sudahSuperApps = parseBool(val);
      } else if (field === "scope") {
        mapped.scope = parseScope(val);
      } else if (field === "kesiapanIntegrasi") {
        mapped.kesiapanIntegrasi = parseIntegration(val);
      } else {
        (mapped as Record<string, unknown>)[field] = cleanText(val) ?? "";
      }
    }

    const importRow = mapped as ImportRow;
    importRow.errors = importRow.errors ?? [];
    importRow.tahunPekerjaan = importRow.tahunPekerjaan || new Date().getFullYear();
    importRow.scope = importRow.scope ?? "INTERNAL";
    importRow.sudahSuperApps = importRow.sudahSuperApps ?? false;
    importRow.kesiapanIntegrasi = importRow.kesiapanIntegrasi ?? "NOT_READY";

    if (!importRow.jenisLayanan?.trim()) {
      importRow.errors.push("Jenis layanan kosong");
    }
    if (!importRow.kelompokLayanan?.trim()) {
      importRow.errors.push("Kelompok layanan kosong");
    }

    const uke = resolveUke(importRow, ukeByCode, ukeByName);
    if (!uke && (importRow.ukeCode || importRow.unitKerja)) {
      importRow.errors.push("UKE / Unit Kerja tidak ditemukan");
    }

    if (
      session.role === "OPERATOR_UKE" &&
      session.ukeId &&
      uke &&
      uke.id !== session.ukeId
    ) {
      importRow.errors.push("UKE tidak sesuai dengan akses operator");
    }

    const dupKey = serviceDuplicateKey(
      importRow.kelompokLayanan ?? "",
      importRow.jenisLayanan ?? "",
      importRow.tahunPekerjaan,
      importRow.scope
    );
    const existing = serviceByKey.get(dupKey);

    if (seenKeys.has(dupKey)) {
      importRow.status = "duplicate";
      importRow.errors.push("Duplikat dalam file");
    } else if (existing) {
      importRow.status = "update";
      importRow.existingId = existing.id;
    } else if (importRow.errors.length > 0) {
      importRow.status = "error";
    } else {
      importRow.status = "new";
    }

    seenKeys.add(dupKey);
    rows.push(importRow);
  });

  const importRecord = await prisma.import.create({
    data: {
      filename: file.name,
      status: "PREVIEW",
      totalRows: rows.length,
      insertedCount: rows.filter((r) => r.status === "new").length,
      updatedCount: rows.filter((r) => r.status === "update").length,
      skippedCount: rows.filter((r) => r.status === "duplicate").length,
      errorCount: rows.filter((r) => r.status === "error").length,
      validationReport: rows as unknown as import("@prisma/client").Prisma.InputJsonValue,
      userId: session.id,
    },
  });

  return { success: true, data: { importId: importRecord.id, rows } };
}

export async function commitImport(importId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const importRecord = await prisma.import.findUnique({ where: { id: importId } });
  if (!importRecord || importRecord.status !== "PREVIEW") {
    return { success: false, error: "Import tidak valid atau sudah di-commit" };
  }

  const rows = importRecord.validationReport as unknown as ImportRow[];
  const [ukes, existingServices] = await Promise.all([
    prisma.uke.findMany(),
    prisma.service.findMany({
      where: { isDeleted: false },
      include: { fungsi: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const ukeByCode = new Map(ukes.map((u) => [u.code.toLowerCase(), u]));
  const ukeByName = new Map(ukes.map((u) => [u.name.toLowerCase(), u]));
  const serviceByKey = new Map(
    existingServices.map((s) => [
      serviceDuplicateKey(s.kelompokLayanan, s.jenisLayanan, s.tahunPekerjaan, s.scope),
      s,
    ])
  );
  const serviceById = new Map(existingServices.map((s) => [s.id, s]));

  const snapshot: ImportSnapshot = { created: [], updated: [] };
  const historyRecords: Prisma.ServiceHistoryCreateManyInput[] = [];
  const seenKeys = new Set<string>();
  let errors = 0;

  const createPayloads: Prisma.ServiceCreateManyInput[] = [];
  const updateJobs: {
    targetId: string;
    data: ReturnType<typeof rowToServiceData>;
    before: ServiceBefore;
  }[] = [];

  for (const row of rows) {
    if (row.status === "error" || row.status === "duplicate") {
      errors++;
      continue;
    }

    const dupKey = serviceDuplicateKey(
      row.kelompokLayanan,
      row.jenisLayanan,
      row.tahunPekerjaan,
      row.scope
    );
    if (seenKeys.has(dupKey)) {
      errors++;
      continue;
    }
    seenKeys.add(dupKey);

    const existing = serviceByKey.get(dupKey);
    const targetId = existing?.id ?? row.existingId;
    const uke = resolveUke(row, ukeByCode, ukeByName);
    const data = rowToServiceData(row, uke?.id ?? null);

    if (targetId) {
      const before = serviceById.get(targetId);
      if (!before || before.isDeleted) {
        errors++;
        continue;
      }
      updateJobs.push({
        targetId,
        data,
        before: toRollbackBefore(before),
      });
    } else {
      createPayloads.push(data);
    }
  }

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < createPayloads.length; i += COMMIT_BATCH_SIZE) {
    const chunk = createPayloads.slice(i, i + COMMIT_BATCH_SIZE);
    const created = await prisma.service.createManyAndReturn({ data: chunk });
    inserted += created.length;

    for (let j = 0; j < created.length; j++) {
      const service = created[j];
      const payload = chunk[j];
      snapshot.created.push(service.id);
      historyRecords.push({
        serviceId: service.id,
        action: "CREATED",
        userId: session.id,
        snapshot: payload as unknown as Prisma.InputJsonValue,
      });
    }
  }

  for (let i = 0; i < updateJobs.length; i += COMMIT_BATCH_SIZE) {
    const chunk = updateJobs.slice(i, i + COMMIT_BATCH_SIZE);
    const results = await Promise.all(
      chunk.map(async (job) => {
        await prisma.service.update({ where: { id: job.targetId }, data: job.data });
        return job;
      })
    );

    updated += results.length;
    for (const job of results) {
      snapshot.updated.push({
        id: job.targetId,
        before: job.before,
      });
      historyRecords.push({
        serviceId: job.targetId,
        action: "UPDATED",
        userId: session.id,
        snapshot: {
          before: job.before,
          after: job.data,
        } as unknown as Prisma.InputJsonValue,
      });
    }
  }

  if (inserted === 0 && updated === 0) {
    return {
      success: false,
      error: "Tidak ada baris valid untuk di-commit. Jalankan preview ulang.",
    };
  }

  await flushHistoryBatch(historyRecords);

  await prisma.import.update({
    where: { id: importId },
    data: {
      status: "COMMITTED",
      insertedCount: inserted,
      updatedCount: updated,
      errorCount: errors,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      committedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      type: "IMPORT_COMMIT",
      title: "Import spreadsheet selesai",
      message: `${inserted} layanan baru, ${updated} layanan diperbarui`,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "IMPORT_COMMIT",
    entity: "Import",
    entityId: importId,
    metadata: { inserted, updated, errors },
  });

  revalidatePath("/import");
  revalidatePath("/services");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rollbackImport(
  importId: string
): Promise<ActionResult<{ deleted: number; restored: number; skipped: number }>> {
  const session = await requireRole(["ADMINISTRATOR"]);

  const importRecord = await prisma.import.findUnique({ where: { id: importId } });
  if (!importRecord || importRecord.status !== "COMMITTED") {
    return { success: false, error: "Import tidak dapat di-rollback" };
  }

  const latestCommittedId = await getLatestCommittedImportId();
  if (latestCommittedId !== importId) {
    return {
      success: false,
      error: "Rollback hanya dapat dilakukan pada import terakhir yang di-commit",
    };
  }

  const raw = importRecord.snapshot as ImportSnapshot | { created?: string[]; updated?: unknown[] } | null;
  const created = raw?.created ?? [];
  const updated = Array.isArray(raw?.updated) ? raw.updated : [];

  let deleted = 0;
  let restored = 0;
  let skipped = 0;
  const now = new Date();

  for (const id of created) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      skipped++;
      continue;
    }

    await prisma.service.update({
      where: { id },
      data: { isDeleted: true, deletedAt: now },
    });
    await recordServiceHistory({
      serviceId: id,
      action: "DELETED",
      userId: session.id,
      fieldName: "rollback",
      newValue: `Rollback import ${importId}`,
    });
    deleted++;
  }

  for (const entry of updated) {
    if (typeof entry === "string" || !entry || typeof entry !== "object" || !("before" in entry)) {
      skipped++;
      continue;
    }

    const { id, before } = entry as ImportUpdatedSnapshot;
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      skipped++;
      continue;
    }

    await prisma.service.update({
      where: { id },
      data: {
        ...before,
        isDeleted: false,
        deletedAt: null,
        fungsi: {
          deleteMany: {},
          create: before.fungsi.map((f) => ({ nama: f.nama, sortOrder: f.sortOrder })),
        },
      },
    });
    await recordServiceHistory({
      serviceId: id,
      action: "UPDATED",
      userId: session.id,
      fieldName: "rollback",
      newValue: `Restore dari rollback import ${importId}`,
    });
    restored++;
  }

  await prisma.import.update({
    where: { id: importId },
    data: { status: "ROLLED_BACK", rolledBackAt: now },
  });

  await createAuditLog({
    userId: session.id,
    action: "IMPORT_ROLLBACK",
    entity: "Import",
    entityId: importId,
    metadata: { deleted, restored, skipped },
  });

  revalidatePath("/import");
  revalidatePath("/services");
  revalidatePath("/dashboard");
  return { success: true, data: { deleted, restored, skipped } };
}

export async function getImports() {
  await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  return prisma.import.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 50,
  });
}

export async function getImportById(id: string) {
  await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  return prisma.import.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function downloadImportTemplate(): Promise<
  ActionResult<{ base64: string; filename: string }>
> {
  await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(buildImportTemplateRows());
  XLSX.utils.book_append_sheet(workbook, sheet, "Layanan");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return {
    success: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: IMPORT_TEMPLATE_FILENAME,
    },
  };
}
