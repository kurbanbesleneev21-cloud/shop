import "server-only";
import { prisma } from "./prisma";

const memory = new Map<string, { count: number; resetAt: number }>();

/** Fast in-memory limiter (per instance) — used for general API traffic. */
export function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/** Durable limiter stored in PostgreSQL — shared across serverless instances (auth, uploads, AI). */
export async function dbLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    return (rows[0]?.count ?? 0) <= limit;
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

export async function resetLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => undefined);
}
