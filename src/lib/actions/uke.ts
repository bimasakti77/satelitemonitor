"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, canWrite } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { ukeSchema } from "@/lib/validations";
import type { ActionResult } from "./auth";

export async function getUkes(includeInactive = false) {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  return prisma.uke.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(session.role === "OPERATOR_UKE" && session.ukeId
        ? { id: session.ukeId }
        : {}),
    },
    orderBy: { code: "asc" },
    include: { _count: { select: { services: true } } },
  });
}

export async function createUke(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["ADMINISTRATOR"]);
  const parsed = ukeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const existing = await prisma.uke.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return { success: false, error: "Kode UKE sudah digunakan" };
  }

  const uke = await prisma.uke.create({ data: parsed.data });
  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entity: "Uke",
    entityId: uke.id,
    metadata: parsed.data,
  });

  revalidatePath("/master/uke");
  return { success: true, data: { id: uke.id } };
}

export async function updateUke(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR"]);
  const parsed = ukeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  await prisma.uke.update({ where: { id }, data: parsed.data });
  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "Uke",
    entityId: id,
    metadata: parsed.data,
  });

  revalidatePath("/master/uke");
  return { success: true };
}

export async function deleteUke(id: string): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR"]);

  const serviceCount = await prisma.service.count({
    where: { ukeId: id, isDeleted: false },
  });
  if (serviceCount > 0) {
    return { success: false, error: "UKE masih memiliki layanan aktif" };
  }

  await prisma.uke.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "Uke",
    entityId: id,
  });

  revalidatePath("/master/uke");
  return { success: true };
}

export async function canManageMasterData(role: string) {
  return canWrite(role as "ADMINISTRATOR" | "OPERATOR_UKE" | "EXECUTIVE");
}
