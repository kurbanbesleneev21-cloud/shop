import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tm_session";

export type SessionPayload = { sub: string; role: "BUYER" | "SELLER" | "ADMIN"; v: number };

function secretKey() {
  const s = process.env.AUTH_SECRET || "";
  return new TextEncoder().encode(s.length >= 16 ? s : "insecure-fallback-secret-please-configure");
}

export async function signSession(payload: SessionPayload, days: number) {
  return new SignJWT({ role: payload.role, v: payload.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey());
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as SessionPayload["role"], v: Number(payload.v ?? 0) };
  } catch {
    return null;
  }
}
