"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getNotifications(limit = 50) {
  await requireAuth();
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      service: {
        select: { jenisLayanan: true, uke: { select: { code: true } } },
      },
    },
  });
}

export async function getUnreadCount() {
  await requireAuth();
  return prisma.notification.count({ where: { isRead: false } });
}

export async function markAsRead(id: string) {
  await requireAuth();
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}

export async function markAllAsRead() {
  await requireAuth();
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}
