"use server";

import { requireAuth } from "@/lib/auth";
import { checkAllServerHealth, type ServerHealthResult } from "@/lib/server-health";
import type { ActionResult } from "./auth";

export async function getServerHealthStatuses(): Promise<ServerHealthResult[]> {
  await requireAuth();
  return checkAllServerHealth();
}

export async function refreshServerHealthStatuses(): Promise<
  ActionResult<ServerHealthResult[]>
> {
  try {
    await requireAuth();
    const results = await checkAllServerHealth();
    return { success: true, data: results };
  } catch {
    return { success: false, error: "Gagal memeriksa status server" };
  }
}
