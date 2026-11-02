import "server-only";
import { prisma } from "./prisma";
import type { CurrentUser } from "./session";

export async function audit(actor: CurrentUser | null, action: string, entity: string, entityId?: string | null, details?: unknown, ip?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actor ? `${actor.name} <${actor.email}>` : "system",
        action,
        entity,
        entityId: entityId ?? null,
        details: details === undefined ? undefined : JSON.parse(JSON.stringify(details)),
        ip,
      },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
