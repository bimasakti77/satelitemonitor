"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getKelompokLayananOptions() {
  await requireAuth();

  const groups = await prisma.service.findMany({
    where: { isDeleted: false },
    select: { kelompokLayanan: true },
    distinct: ["kelompokLayanan"],
    orderBy: { kelompokLayanan: "asc" },
  });

  return groups.map((g) => g.kelompokLayanan);
}
