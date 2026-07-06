"use server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { loginSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || !user.isActive) {
    return { success: false, error: "Email atau password salah" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Email atau password salah" };
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ukeId: user.ukeId,
  };

  await createSession(sessionUser);
  await createAuditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (session) {
    await createAuditLog({
      userId: session.id,
      action: "LOGOUT",
      entity: "User",
      entityId: session.id,
    });
  }
  await destroySession();
  redirect("/login");
}
