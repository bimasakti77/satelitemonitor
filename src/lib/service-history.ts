import { prisma } from "@/lib/prisma";
import type { HistoryAction, Prisma } from "@prisma/client";

export async function recordServiceHistory(params: {
  serviceId: string;
  action: HistoryAction;
  userId: string;
  fieldName?: string;
  previousValue?: string | null;
  newValue?: string | null;
  snapshot?: Prisma.InputJsonValue;
}) {
  return prisma.serviceHistory.create({
    data: params,
  });
}

export async function recordServiceFieldChanges(
  serviceId: string,
  userId: string,
  previous: Record<string, unknown>,
  updated: Record<string, unknown>,
  fieldLabels: Record<string, string>
) {
  const changes: Promise<unknown>[] = [];

  for (const [key, newVal] of Object.entries(updated)) {
    const oldVal = previous[key];
    const oldStr = oldVal == null ? null : String(oldVal);
    const newStr = newVal == null ? null : String(newVal);

    if (oldStr !== newStr) {
      changes.push(
        recordServiceHistory({
          serviceId,
          action: "UPDATED",
          userId,
          fieldName: fieldLabels[key] ?? key,
          previousValue: oldStr,
          newValue: newStr,
        })
      );
    }
  }

  await Promise.all(changes);
}
