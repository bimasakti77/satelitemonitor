"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { recordServiceHistory, recordServiceFieldChanges } from "@/lib/service-history";
import { createServiceNotification } from "@/lib/notifications";
import { serviceSchema, type ServiceInput } from "@/lib/validations";
import { SERVICE_FIELD_LABELS } from "@/lib/constants";
import type { ActionResult } from "./auth";
import type { Prisma } from "@prisma/client";

export interface ServiceFilters {
  search?: string;
  ukeId?: string;
  kelompokLayanan?: string;
  tahunPekerjaan?: number;
  scope?: string;
  sudahSuperApps?: boolean;
  kesiapanIntegrasi?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const serviceInclude = {
  uke: { select: { code: true, name: true } },
  fungsi: { orderBy: { sortOrder: "asc" as const } },
};

function buildWhere(
  filters: ServiceFilters,
  sessionUkeId?: string | null
): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = { isDeleted: false };

  if (sessionUkeId) where.ukeId = sessionUkeId;
  if (filters.ukeId) where.ukeId = filters.ukeId;
  if (filters.kelompokLayanan) where.kelompokLayanan = filters.kelompokLayanan;
  if (filters.tahunPekerjaan) where.tahunPekerjaan = filters.tahunPekerjaan;
  if (filters.scope) where.scope = filters.scope as "INTERNAL" | "EKSTERNAL";
  if (filters.sudahSuperApps !== undefined)
    where.sudahSuperApps = filters.sudahSuperApps;
  if (filters.kesiapanIntegrasi)
    where.kesiapanIntegrasi = filters.kesiapanIntegrasi as
      | "Q1"
      | "Q2"
      | "Q3"
      | "NOT_READY";

  if (filters.search) {
    where.OR = [
      { jenisLayanan: { contains: filters.search, mode: "insensitive" } },
      { kelompokLayanan: { contains: filters.search, mode: "insensitive" } },
      { namaAplikasi: { contains: filters.search, mode: "insensitive" } },
      { detailAplikasi: { contains: filters.search, mode: "insensitive" } },
      { fungsi: { some: { nama: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function parseServiceForm(formData: FormData): ServiceInput {
  const ukeId = formData.get("ukeId");
  const scope = formData.get("scope") as "INTERNAL" | "EKSTERNAL";
  const fungsi = formData
    .getAll("fungsi")
    .map((v) => String(v).trim())
    .filter(Boolean);

  return {
    ukeId: ukeId && ukeId !== "none" ? String(ukeId) : "",
    kelompokLayanan: String(formData.get("kelompokLayanan") ?? "").trim(),
    jenisLayanan: String(formData.get("jenisLayanan") ?? "").trim(),
    tahunPekerjaan: Number(formData.get("tahunPekerjaan")),
    scope,
    tipeLayananInternal:
      scope === "INTERNAL"
        ? String(formData.get("tipeLayananInternal") ?? "").trim() || null
        : null,
    sudahSuperApps: formData.get("sudahSuperApps") === "true",
    kesiapanIntegrasi: formData.get("kesiapanIntegrasi") as ServiceInput["kesiapanIntegrasi"],
    namaAplikasi: String(formData.get("namaAplikasi") ?? "").trim() || null,
    detailAplikasi: String(formData.get("detailAplikasi") ?? "").trim() || null,
    fungsi,
  };
}

function buildFungsiCreate(fungsi: string[]) {
  return fungsi.map((nama, sortOrder) => ({ nama, sortOrder }));
}

export async function getServices(filters: ServiceFilters = {}) {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortOrder = filters.sortOrder ?? "desc";

  const sessionUkeId =
    session.role === "OPERATOR_UKE" ? session.ukeId : undefined;

  const where = buildWhere(filters, sessionUkeId);

  const orderBy: Prisma.ServiceOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: serviceInclude,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getServiceById(id: string) {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      uke: true,
      fungsi: { orderBy: { sortOrder: "asc" } },
      histories: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!service) return null;
  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    service.ukeId !== session.ukeId
  ) {
    return null;
  }

  return service;
}

export async function createService(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const parsed = serviceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    parsed.data.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat membuat layanan untuk UKE lain" };
  }

  const { fungsi, ...data } = parsed.data;

  const service = await prisma.service.create({
    data: {
      ...data,
      fungsi: { create: buildFungsiCreate(fungsi) },
    },
  });

  await recordServiceHistory({
    serviceId: service.id,
    action: "CREATED",
    userId: session.id,
    snapshot: parsed.data,
  });

  await createServiceNotification({
    serviceId: service.id,
    type: "NEW_SERVICE",
    title: "Layanan Baru",
    message: `${parsed.data.jenisLayanan} telah ditambahkan`,
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entity: "Service",
    entityId: service.id,
    metadata: parsed.data,
  });

  revalidatePath("/services");
  revalidatePath("/dashboard");
  return { success: true, data: { id: service.id } };
}

export async function updateService(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return { success: false, error: "Layanan tidak ditemukan" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    existing.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat mengubah layanan UKE lain" };
  }

  const parsed = serviceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { fungsi, ...data } = parsed.data;
  const previous = { ...existing };

  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...data,
      fungsi: {
        deleteMany: {},
        create: buildFungsiCreate(fungsi),
      },
    },
    include: { fungsi: true },
  });

  await recordServiceFieldChanges(
    id,
    session.id,
    previous as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    SERVICE_FIELD_LABELS
  );

  await createServiceNotification({
    serviceId: id,
    type: "UPDATED_SERVICE",
    title: "Layanan Diperbarui",
    message: `${parsed.data.jenisLayanan} telah diperbarui`,
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "Service",
    entityId: id,
    metadata: parsed.data,
  });

  revalidatePath("/services");
  revalidatePath(`/services/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return { success: false, error: "Layanan tidak ditemukan" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    existing.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat menghapus layanan UKE lain" };
  }

  await prisma.service.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await recordServiceHistory({
    serviceId: id,
    action: "DELETED",
    userId: session.id,
    snapshot: existing,
  });

  await createServiceNotification({
    serviceId: id,
    type: "DELETED_SERVICE",
    title: "Layanan Dihapus",
    message: `${existing.jenisLayanan} telah dihapus`,
  });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "Service",
    entityId: id,
  });

  revalidatePath("/services");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAllServices(
  filters: ServiceFilters = {}
): Promise<ActionResult<{ count: number }>> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const sessionUkeId =
    session.role === "OPERATOR_UKE" ? session.ukeId : undefined;
  const where = buildWhere(filters, sessionUkeId);

  const services = await prisma.service.findMany({
    where,
    select: { id: true, jenisLayanan: true },
  });

  if (services.length === 0) {
    return { success: false, error: "Tidak ada layanan untuk dihapus" };
  }

  const now = new Date();
  await prisma.service.updateMany({
    where: { id: { in: services.map((s) => s.id) } },
    data: { isDeleted: true, deletedAt: now },
  });

  await Promise.all(
    services.map((service) =>
      recordServiceHistory({
        serviceId: service.id,
        action: "DELETED",
        userId: session.id,
        fieldName: "bulk_delete",
        newValue: "Hapus semua layanan",
      })
    )
  );

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "Service",
    metadata: {
      bulk: true,
      count: services.length,
      filters,
    },
  });

  revalidatePath("/services");
  revalidatePath("/dashboard");
  return { success: true, data: { count: services.length } };
}

export async function getServiceHistory(serviceId: string) {
  await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  return prisma.serviceHistory.findMany({
    where: { serviceId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}
