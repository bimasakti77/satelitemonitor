import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: params,
  });
}
