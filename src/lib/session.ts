import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SESSION_COOKIE, signSession, verifySession } from "./jwt";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  emailVerified: Date | null;
  phoneVerified: Date | null;
  seller: { id: string; status: string; shopName: string; slug: string; commissionRate: number | null } | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true, name: true, email: true, phone: true, role: true, emailVerified: true, phoneVerified: true,
      blocked: true, tokenVersion: true,
      seller: { select: { id: true, status: true, shopName: true, slug: true, commissionRate: true } },
    },
  });
  if (!user || user.blocked || user.tokenVersion !== payload.v) return null;
  const { blocked: _b, tokenVersion: _t, ...rest } = user;
  return rest;
});

export async function createSession(user: { id: string; role: CurrentUser["role"]; tokenVersion: number }, days = 30) {
  const token = await signSession({ sub: user.id, role: user.role, v: user.tokenVersion }, days);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 3600,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
