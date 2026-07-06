"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { applicationSchema } from "@/lib/validations";
import type { ActionResult } from "./auth";

export async function getApplications(includeInactive = false) {
  await requireRole(["ADMINISTRATOR", "OPERATOR_UKE", "EXECUTIVE"]);
  return prisma.application.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createApplication(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["ADMINISTRATOR"]);
  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    vendor: formData.get("vendor") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const existing = await prisma.application.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { success: false, error: "Nama aplikasi sudah digunakan" };
  }

  const app = await prisma.application.create({ data: parsed.data });
  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entity: "Application",
    entityId: app.id,
    metadata: parsed.data,
  });

  revalidatePath("/master/applications");
  return { success: true, data: { id: app.id } };
}

export async function updateApplication(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR"]);
  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    vendor: formData.get("vendor") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  await prisma.application.update({ where: { id }, data: parsed.data });
  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entity: "Application",
    entityId: id,
    metadata: parsed.data,
  });

  revalidatePath("/master/applications");
  return { success: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const session = await requireRole(["ADMINISTRATOR"]);

  await prisma.application.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: session.id,
    action: "DELETE",
    entity: "Application",
    entityId: id,
  });

  revalidatePath("/master/applications");
  return { success: true };
}
