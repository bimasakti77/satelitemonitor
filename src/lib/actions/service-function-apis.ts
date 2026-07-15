"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { serviceFunctionApiSchema } from "@/lib/validations";
import type { ActionResult } from "./auth";
import type { FunctionApiStatus } from "@prisma/client";

async function assertCanManageFunction(functionId: string, sessionUkeId?: string | null) {
  const fn = await prisma.serviceFunction.findUnique({
    where: { id: functionId },
    include: {
      service: { select: { id: true, ukeId: true, isDeleted: true, jenisLayanan: true } },
    },
  });

  if (!fn || fn.service.isDeleted) {
    return { ok: false as const, error: "Fungsi layanan tidak ditemukan" };
  }

  if (sessionUkeId && fn.service.ukeId !== sessionUkeId) {
    return { ok: false as const, error: "Tidak dapat mengubah layanan UKE lain" };
  }

  return { ok: true as const, fn };
}

function parseApiForm(formData: FormData) {
  return {
    nama: String(formData.get("nama") ?? "").trim(),
    endpoint: String(formData.get("endpoint") ?? "").trim() || null,
    status: String(formData.get("status") ?? "BELUM_TERSEDIA"),
    catatan: String(formData.get("catatan") ?? "").trim() || null,
  };
}

export async function createServiceFunctionApi(
  functionId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);
  const access = await assertCanManageFunction(
    functionId,
    session.role === "OPERATOR_UKE" ? session.ukeId : null
  );
  if (!access.ok) return { success: false, error: access.error };

  const parsed = serviceFunctionApiSchema.safeParse(parseApiForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const maxSort = await prisma.serviceFunctionApi.aggregate({
    where: { functionId },
    _max: { sortOrder: true },
  });

  const api = await prisma.serviceFunctionApi.create({
    data: {
      functionId,
      ...parsed.data,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entity: "ServiceFunctionApi",
    entityId: api.id,
    metadata: {
      functionId,
      serviceId: access.fn.service.id,
      ...parsed.data,
    },
  });

  revalidatePath(`/services/${access.fn.service.id}`);
  return { success: true, data: { id: api.id } };
}

export async function updateServiceFunctionApi(
  apiId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const existing = await prisma.serviceFunctionApi.findUnique({
    where: { id: apiId },
    include: {
      function: {
        include: {
          service: { select: { id: true, ukeId: true, isDeleted: true } },
        },
      },
    },
  });

  if (!existing || existing.function.service.isDeleted) {
    return { success: false, error: "API tidak ditemukan" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    existing.function.service.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat mengubah layanan UKE lain" };
  }

  const parsed = serviceFunctionApiSchema.safeParse(parseApiForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  await prisma.serviceFunctionApi.update({
    where: { id: apiId },
    data: parsed.data,
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "ServiceFunctionApi",
    entityId: apiId,
    metadata: parsed.data,
  });

  revalidatePath(`/services/${existing.function.service.id}`);
  return { success: true };
}

export async function updateServiceFunctionApiStatus(
  apiId: string,
  status: FunctionApiStatus
): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const allowed: FunctionApiStatus[] = [
    "BELUM_TERSEDIA",
    "ON_PROGRESS",
    "SUDAH_TERSEDIA",
  ];
  if (!allowed.includes(status)) {
    return { success: false, error: "Status API tidak valid" };
  }

  const existing = await prisma.serviceFunctionApi.findUnique({
    where: { id: apiId },
    include: {
      function: {
        include: {
          service: { select: { id: true, ukeId: true, isDeleted: true } },
        },
      },
    },
  });

  if (!existing || existing.function.service.isDeleted) {
    return { success: false, error: "API tidak ditemukan" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    existing.function.service.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat mengubah layanan UKE lain" };
  }

  if (existing.status === status) {
    return { success: true };
  }

  await prisma.serviceFunctionApi.update({
    where: { id: apiId },
    data: { status },
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE_STATUS",
    entity: "ServiceFunctionApi",
    entityId: apiId,
    metadata: { previous: existing.status, status },
  });

  revalidatePath(`/services/${existing.function.service.id}`);
  return { success: true };
}

export async function deleteServiceFunctionApi(apiId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);

  const existing = await prisma.serviceFunctionApi.findUnique({
    where: { id: apiId },
    include: {
      function: {
        include: {
          service: { select: { id: true, ukeId: true, isDeleted: true } },
        },
      },
    },
  });

  if (!existing || existing.function.service.isDeleted) {
    return { success: false, error: "API tidak ditemukan" };
  }

  if (
    session.role === "OPERATOR_UKE" &&
    session.ukeId &&
    existing.function.service.ukeId !== session.ukeId
  ) {
    return { success: false, error: "Tidak dapat mengubah layanan UKE lain" };
  }

  await prisma.serviceFunctionApi.delete({ where: { id: apiId } });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "ServiceFunctionApi",
    entityId: apiId,
    metadata: {
      nama: existing.nama,
      functionId: existing.functionId,
    },
  });

  revalidatePath(`/services/${existing.function.service.id}`);
  return { success: true };
}
