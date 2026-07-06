"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function getAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  entity?: string;
  userId?: string;
}) {
  await requireRole(["ADMINISTRATOR", "EXECUTIVE"]);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  const where = {
    ...(params?.entity ? { entity: params.entity } : {}),
    ...(params?.userId ? { userId: params.userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
