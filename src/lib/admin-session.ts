/**
 * ADMIN session — a signed, HTTP-only cookie independent of NextAuth.
 * The cookie carries the Supabase user id + role after Supabase Auth has
 * verified the staff password. Routes treat this as the source of truth.
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Secure-rohde.admin" : "rohde.admin";

const encoder = new TextEncoder();
const secretKey = encoder.encode(env.NEXTAUTH_SECRET);

export type AdminSession = {
  sub: string; // supabase user id
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
};

export async function createAdminSession(session: AdminSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as AdminSession["role"]) ?? "STAFF",
    };
  } catch {
    return null;
  }
}
