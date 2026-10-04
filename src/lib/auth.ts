import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is missing");
  return new TextEncoder().encode(value);
}

export async function signSession(user: { id: string; role: string; name: string }) {
  return new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSession(): Promise<{ id: string; role: string; name: string } | null> {
  const token = (await cookies()).get("hsc_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || (payload.role !== "ADMIN" && payload.role !== "STAFF")) return null;
    return { id: payload.sub, role: payload.role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return null;
  if (user.role !== "ADMIN" && user.role !== "STAFF") return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
  };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set("hsc_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set("hsc_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
