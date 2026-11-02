import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const data = await body(req, z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    role: z.enum(["BUYER", "SELLER", "ADMIN"]).optional(),
    blocked: z.boolean().optional(),
    blockReason: z.string().trim().max(300).optional().nullable(),
    verifyEmail: z.boolean().optional(),
    logoutEverywhere: z.boolean().optional(),
  }));
  const u = await prisma.user.findUnique({ where: { id: params.id } });
  if (!u) throw new ApiError(404, "Пользователь не найден");
  if (u.id === user!.id && (data.blocked || (data.role && data.role !== "ADMIN"))) throw new ApiError(400, "Нельзя заблокировать или понизить собственный аккаунт");
  await prisma.user.update({
    where: { id: u.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.blocked !== undefined ? { blocked: data.blocked, blockReason: data.blocked ? data.blockReason ?? null : null, tokenVersion: data.blocked ? { increment: 1 } : undefined } : {}),
      ...(data.verifyEmail ? { emailVerified: new Date() } : {}),
      ...(data.logoutEverywhere ? { tokenVersion: { increment: 1 } } : {}),
    },
  });
  await audit(user, "user.update", "user", u.id, data, ip);
  return ok();
});
