import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const COOKIE_NAME = "superapps_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ukeId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ukeId: user.ukeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      ukeId: (payload.ukeId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      ukeId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    // Cookie deletion is only allowed in Server Actions / Route Handlers / middleware.
    redirect("/login?clear=1");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ukeId: user.ukeId,
  };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<SessionUser> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }
  return session;
}

export function canWrite(role: UserRole): boolean {
  return role === "ADMINISTRATOR" || role === "OPERATOR_UKE";
}

export function isReadOnly(role: UserRole): boolean {
  return role === "EXECUTIVE";
}

export function getOperatorUkeFilter(session: SessionUser): string | undefined {
  return session.role === "OPERATOR_UKE" && session.ukeId ? session.ukeId : undefined;
}

export async function getUserFromDb(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { uke: true },
  });
}
