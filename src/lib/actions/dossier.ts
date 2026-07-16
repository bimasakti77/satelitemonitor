"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  canManageDossier,
  requireDossierAccess,
} from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { DOSSIER_DOMAIN_SEED } from "@/lib/constants";
import type { ActionResult } from "./auth";
import type { DomainProgressStatus } from "@prisma/client";
import {
  computeMaturityFromEvidenceLevels,
  deleteStoredFile,
  ensureDomainEvidenceDirs,
  isDomainLevelUnlocked,
  saveDomainEvidenceFile,
  validateEvidenceFile,
} from "@/lib/domain-evidence-storage";

const DOSSIER_PATHS = [
  "/dossier",
  "/dossier/dashboard",
  "/dossier/domain",
  "/dossier/indikator",
  "/dossier/roadmap",
  "/dossier/dokumen",
];

function revalidateDossier() {
  for (const path of DOSSIER_PATHS) revalidatePath(path);
}

/** Pastikan profile + 10 domain baseline tersedia. */
export async function ensureDossierFoundation() {
  await requireDossierAccess();

  let profile = await prisma.projectProfile.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await prisma.projectProfile.create({
      data: {
        title: "Superapp PASTI",
        subtitle:
          "Strategy for Integrated and Sustainable Service Delivery through the Strengthening of Governance",
        background:
          "Baseline kematangan organisasi dan progress integrasi layanan Kementerian Hukum dan HAM.",
        baselineYear: 2026,
        targetYear: 2028,
        targetMaturityLevel: 4,
      },
    });
  }

  for (const domain of DOSSIER_DOMAIN_SEED) {
    await prisma.dossierDomain.upsert({
      where: { code: domain.code },
      update: {
        name: domain.name,
        sortOrder: domain.sortOrder,
        isActive: true,
      },
      create: {
        code: domain.code,
        name: domain.name,
        sortOrder: domain.sortOrder,
      },
    });
  }

  const domains = await prisma.dossierDomain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const baselineYear = profile.baselineYear;
  for (const domain of domains) {
    await prisma.dossierDomainAssessment.upsert({
      where: {
        domainId_year: { domainId: domain.id, year: baselineYear },
      },
      update: {},
      create: {
        domainId: domain.id,
        year: baselineYear,
        maturityLevel: 0,
        status:
          domain.code === "REGULASI" ||
          domain.code === "GOVERNANCE" ||
          domain.code === "MONITORING"
            ? "VERY_HIGH"
            : "NEEDS_STRENGTHENING",
        remarks:
          domain.code === "MONITORING"
            ? "Monitoring belum terstruktur"
            : "Perlu penguatan baseline",
        targetText: `Target penguatan ${domain.name}`,
      },
    });
  }

  return { profile, domains };
}

export async function getDossierDashboardData() {
  await requireDossierAccess();
  const { profile } = await ensureDossierFoundation();

  const [assessments, indicators, roadmap, documents, servicesAgg] =
    await Promise.all([
      prisma.dossierDomainAssessment.findMany({
        where: { year: profile.baselineYear },
        include: {
          domain: true,
          evidences: {
            where: { isActive: true },
            select: { level: true },
          },
        },
        orderBy: { domain: { sortOrder: "asc" } },
      }),
      prisma.dossierIndicator.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.dossierRoadmapItem.findMany({
        where: { isActive: true },
        orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.dossierDocument.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.service.groupBy({
        by: ["sudahSuperApps"],
        where: { isDeleted: false },
        _count: { id: true },
      }),
    ]);

  const totalServices = servicesAgg.reduce((n, r) => n + r._count.id, 0);
  const integratedServices =
    servicesAgg.find((r) => r.sudahSuperApps)?._count.id ?? 0;

  // Sinkron maturity dari dokumen dukungan
  for (const assessment of assessments) {
    const maturity = computeMaturityFromEvidenceLevels(
      assessment.evidences.map((e) => e.level)
    );
    if (assessment.maturityLevel !== maturity) {
      await prisma.dossierDomainAssessment.update({
        where: { id: assessment.id },
        data: { maturityLevel: maturity },
      });
      assessment.maturityLevel = maturity;
    }
  }

  const maturityAvg =
    assessments.length > 0
      ? assessments.reduce((n, a) => n + a.maturityLevel, 0) / assessments.length
      : 0;

  const highPriorityCount = assessments.filter(
    (a) => a.status === "VERY_HIGH"
  ).length;

  const docsComplete = documents.filter(
    (d) => d.completeness === "COMPLETE" || d.completeness === "VERIFIED"
  ).length;

  return {
    profile,
    assessments,
    indicators,
    roadmap,
    documents,
    summary: {
      maturityAvg,
      domainCount: assessments.length,
      highPriorityCount,
      totalServices,
      integratedServices,
      integratedPct:
        totalServices > 0 ? (integratedServices / totalServices) * 100 : 0,
      docsTotal: documents.length,
      docsComplete,
    },
  };
}

export async function getDossierDomains(year?: number) {
  await requireDossierAccess();
  await ensureDomainEvidenceDirs();
  const { profile } = await ensureDossierFoundation();
  const y = year ?? profile.baselineYear;

  const domains = await prisma.dossierDomain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      assessments: {
        where: { year: y },
        include: {
          evidences: {
            where: { isActive: true },
            orderBy: [{ level: "asc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  // Sinkronkan maturity dari bukti dokumen (rantai berturut level 1→5)
  for (const domain of domains) {
    const assessment = domain.assessments[0];
    if (!assessment) continue;
    const levels = new Set(assessment.evidences.map((e) => e.level));
    const maturity = computeMaturityFromEvidenceLevels(levels);
    if (assessment.maturityLevel !== maturity) {
      await prisma.dossierDomainAssessment.update({
        where: { id: assessment.id },
        data: { maturityLevel: maturity },
      });
      assessment.maturityLevel = maturity;
    }
  }

  return { profile, year: y, domains };
}

async function syncAssessmentMaturity(assessmentId: string) {
  const evidences = await prisma.dossierDomainLevelEvidence.findMany({
    where: { assessmentId, isActive: true },
    select: { level: true },
  });
  const maturity = computeMaturityFromEvidenceLevels(
    evidences.map((e) => e.level)
  );
  await prisma.dossierDomainAssessment.update({
    where: { id: assessmentId },
    data: { maturityLevel: maturity },
  });
  return maturity;
}

export async function updateDomainAssessment(
  assessmentId: string,
  data: {
    status: DomainProgressStatus;
    remarks?: string | null;
    targetText?: string | null;
  }
): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await prisma.dossierDomainAssessment.update({
    where: { id: assessmentId },
    data: {
      status: data.status,
      remarks: data.remarks ?? null,
      targetText: data.targetText ?? null,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "DossierDomainAssessment",
    entityId: assessmentId,
    metadata: data,
  });

  revalidateDossier();
  return { success: true };
}

export async function uploadDomainLevelEvidence(
  formData: FormData
): Promise<ActionResult<{ id: string; maturityLevel: number }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  const level = Number(formData.get("level"));
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const file = formData.get("file");

  if (!assessmentId || !title) {
    return { success: false, error: "Assessment dan judul dokumen wajib diisi" };
  }
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return { success: false, error: "Level harus 1–5" };
  }
  if (!(file instanceof File)) {
    return { success: false, error: "File dokumen wajib diunggah" };
  }

  const fileError = validateEvidenceFile(file);
  if (fileError) return { success: false, error: fileError };

  const assessment = await prisma.dossierDomainAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      domain: true,
      evidences: { where: { isActive: true }, select: { level: true } },
    },
  });
  if (!assessment) return { success: false, error: "Assessment tidak ditemukan" };

  const levelsWithDocs = new Set(assessment.evidences.map((e) => e.level));
  if (!isDomainLevelUnlocked(level, levelsWithDocs)) {
    return {
      success: false,
      error: `Level ${level} terkunci. Unggah dokumen level ${level - 1} terlebih dahulu.`,
    };
  }

  const saved = await saveDomainEvidenceFile({
    domainCode: assessment.domain.code,
    year: assessment.year,
    level,
    file,
  });

  const record = await prisma.dossierDomainLevelEvidence.create({
    data: {
      assessmentId,
      level,
      title,
      notes,
      filename: saved.filename,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      storagePath: saved.storagePath,
      uploadedById: session.id,
    },
  });

  const maturityLevel = await syncAssessmentMaturity(assessmentId);

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entity: "DossierDomainLevelEvidence",
    entityId: record.id,
    metadata: { level, title, maturityLevel },
  });

  revalidateDossier();
  return { success: true, data: { id: record.id, maturityLevel } };
}

export async function updateDomainLevelEvidence(
  formData: FormData
): Promise<ActionResult<{ id: string; maturityLevel: number }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const file = formData.get("file");

  if (!id || !title) {
    return { success: false, error: "ID dan judul dokumen wajib diisi" };
  }

  const existing = await prisma.dossierDomainLevelEvidence.findUnique({
    where: { id },
    include: {
      assessment: {
        include: {
          domain: true,
          evidences: { where: { isActive: true }, select: { level: true } },
        },
      },
    },
  });
  if (!existing || !existing.isActive) {
    return { success: false, error: "Dokumen tidak ditemukan" };
  }

  const levelsWithDocs = new Set(
    existing.assessment.evidences.map((e) => e.level)
  );
  if (!isDomainLevelUnlocked(existing.level, levelsWithDocs)) {
    return {
      success: false,
      error: `Level ${existing.level} terkunci. Lengkapi dokumen level sebelumnya dulu.`,
    };
  }

  let fileFields: {
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
  } | null = null;

  if (file instanceof File && file.size > 0) {
    const fileError = validateEvidenceFile(file);
    if (fileError) return { success: false, error: fileError };

    fileFields = await saveDomainEvidenceFile({
      domainCode: existing.assessment.domain.code,
      year: existing.assessment.year,
      level: existing.level,
      file,
    });
    await deleteStoredFile(existing.storagePath);
  }

  const record = await prisma.dossierDomainLevelEvidence.update({
    where: { id },
    data: {
      title,
      notes,
      ...(fileFields ?? {}),
    },
  });

  const maturityLevel = await syncAssessmentMaturity(existing.assessmentId);

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "DossierDomainLevelEvidence",
    entityId: record.id,
    metadata: { title, replacedFile: Boolean(fileFields) },
  });

  revalidateDossier();
  return { success: true, data: { id: record.id, maturityLevel } };
}

export async function deleteDomainLevelEvidence(
  id: string
): Promise<ActionResult<{ maturityLevel: number }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const existing = await prisma.dossierDomainLevelEvidence.findUnique({
    where: { id },
  });
  if (!existing || !existing.isActive) {
    return { success: false, error: "Dokumen tidak ditemukan" };
  }

  await prisma.dossierDomainLevelEvidence.update({
    where: { id },
    data: { isActive: false },
  });
  await deleteStoredFile(existing.storagePath);

  const maturityLevel = await syncAssessmentMaturity(existing.assessmentId);

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "DossierDomainLevelEvidence",
    entityId: id,
    metadata: { level: existing.level, maturityLevel },
  });

  revalidateDossier();
  return { success: true, data: { maturityLevel } };
}

export async function getDossierIndicators() {
  await requireDossierAccess();
  await ensureDossierFoundation();
  return prisma.dossierIndicator.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function upsertDossierIndicator(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const baselineCondition = String(formData.get("baselineCondition") ?? "").trim();
  const targetCondition = String(formData.get("targetCondition") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!name || !baselineCondition || !targetCondition) {
    return { success: false, error: "Nama, kondisi awal, dan target wajib diisi" };
  }

  const record = id
    ? await prisma.dossierIndicator.update({
        where: { id },
        data: { name, baselineCondition, targetCondition, sortOrder },
      })
    : await prisma.dossierIndicator.create({
        data: { name, baselineCondition, targetCondition, sortOrder },
      });

  await createAuditLog({
    userId: session.id,
    action: id ? "UPDATE" : "CREATE",
    entity: "DossierIndicator",
    entityId: record.id,
  });

  revalidateDossier();
  return { success: true, data: { id: record.id } };
}

export async function deleteDossierIndicator(id: string): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await prisma.dossierIndicator.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "DossierIndicator",
    entityId: id,
  });

  revalidateDossier();
  return { success: true };
}

export async function getDossierRoadmap() {
  await requireDossierAccess();
  await ensureDossierFoundation();
  return prisma.dossierRoadmapItem.findMany({
    where: { isActive: true },
    orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
  });
}

export async function upsertDossierRoadmapItem(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const year = Number(formData.get("year"));
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!title || Number.isNaN(year)) {
    return { success: false, error: "Judul dan tahun wajib diisi" };
  }

  const record = id
    ? await prisma.dossierRoadmapItem.update({
        where: { id },
        data: { title, description, year, sortOrder },
      })
    : await prisma.dossierRoadmapItem.create({
        data: { title, description, year, sortOrder },
      });

  await createAuditLog({
    userId: session.id,
    action: id ? "UPDATE" : "CREATE",
    entity: "DossierRoadmapItem",
    entityId: record.id,
  });

  revalidateDossier();
  return { success: true, data: { id: record.id } };
}

export async function deleteDossierRoadmapItem(id: string): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await prisma.dossierRoadmapItem.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "DossierRoadmapItem",
    entityId: id,
  });

  revalidateDossier();
  return { success: true };
}

export async function getDossierDocuments() {
  await requireDossierAccess();
  await ensureDossierFoundation();

  const [profile, team, documents] = await Promise.all([
    prisma.projectProfile.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dossierTeamMember.findMany({
      where: { isActive: true },
      orderBy: [{ teamType: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.dossierDocument.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return { profile, team, documents };
}

export async function updateProjectProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await ensureDossierFoundation();
  const profile = await prisma.projectProfile.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!profile) return { success: false, error: "Profil proyek tidak ditemukan" };

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const background = String(formData.get("background") ?? "").trim() || null;
  const baselineYear = Number(formData.get("baselineYear") ?? profile.baselineYear);
  const targetYear = Number(formData.get("targetYear") ?? profile.targetYear);
  const targetMaturityLevel = Number(
    formData.get("targetMaturityLevel") ?? profile.targetMaturityLevel
  );

  if (!title) return { success: false, error: "Judul wajib diisi" };

  await prisma.projectProfile.update({
    where: { id: profile.id },
    data: {
      title,
      subtitle,
      background,
      baselineYear,
      targetYear,
      targetMaturityLevel,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "ProjectProfile",
    entityId: profile.id,
  });

  revalidateDossier();
  return { success: true };
}

export async function upsertDossierTeamMember(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const roleTitle = String(formData.get("roleTitle") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const teamType = String(formData.get("teamType") ?? "STEERING");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!name || !roleTitle) {
    return { success: false, error: "Nama dan jabatan/peran wajib diisi" };
  }
  if (teamType !== "STEERING" && teamType !== "EXECUTING") {
    return { success: false, error: "Tipe tim tidak valid" };
  }

  const record = id
    ? await prisma.dossierTeamMember.update({
        where: { id },
        data: { name, roleTitle, unit, teamType, sortOrder },
      })
    : await prisma.dossierTeamMember.create({
        data: { name, roleTitle, unit, teamType, sortOrder },
      });

  await createAuditLog({
    userId: session.id,
    action: id ? "UPDATE" : "CREATE",
    entity: "DossierTeamMember",
    entityId: record.id,
  });

  revalidateDossier();
  return { success: true, data: { id: record.id } };
}

export async function deleteDossierTeamMember(id: string): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await prisma.dossierTeamMember.update({
    where: { id },
    data: { isActive: false },
  });

  revalidateDossier();
  return { success: true };
}

export async function upsertDossierDocumentMeta(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const completeness = String(formData.get("completeness") ?? "NOT_AVAILABLE");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!category || !title) {
    return { success: false, error: "Kategori dan judul wajib diisi" };
  }

  const allowed = ["NOT_AVAILABLE", "DRAFT", "COMPLETE", "VERIFIED"] as const;
  if (!allowed.includes(completeness as (typeof allowed)[number])) {
    return { success: false, error: "Status kelengkapan tidak valid" };
  }

  const record = id
    ? await prisma.dossierDocument.update({
        where: { id },
        data: {
          category,
          title,
          description,
          completeness: completeness as (typeof allowed)[number],
          notes,
          sortOrder,
        },
      })
    : await prisma.dossierDocument.create({
        data: {
          category,
          title,
          description,
          completeness: completeness as (typeof allowed)[number],
          notes,
          sortOrder,
        },
      });

  await createAuditLog({
    userId: session.id,
    action: id ? "UPDATE" : "CREATE",
    entity: "DossierDocument",
    entityId: record.id,
  });

  revalidateDossier();
  return { success: true, data: { id: record.id } };
}

export async function deleteDossierDocument(id: string): Promise<ActionResult> {
  const session = await requireDossierAccess();
  if (!canManageDossier(session.role)) {
    return { success: false, error: "Hanya Administrator yang dapat mengubah data" };
  }

  await prisma.dossierDocument.update({
    where: { id },
    data: { isActive: false },
  });

  revalidateDossier();
  return { success: true };
}
