import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { codeHash } from "@/lib/auth-tokens";
import { dbLimit } from "@/lib/rate-limit";

export const POST = route({ auth: "user" }, async (req, { user }) => {
  const { code } = await body(req, z.object({ code: z.string().trim().regex(/^\d{6}$/, "Код — 6 цифр") }));
  if (user!.emailVerified) return ok({ ok: true });
  if (!(await dbLimit("verify-code:" + user!.id, 8, 30 * 60_000))) throw new ApiError(429, "Слишком много попыток. Запросите новый код через 30 минут.");
  const rec = await prisma.verificationToken.findUnique({ where: { tokenHash: codeHash(user!.id, code) } });
  if (!rec || rec.userId !== user!.id || rec.type !== "EMAIL_VERIFY" || rec.usedAt || rec.expiresAt < new Date()) throw new ApiError(400, "Неверный или устаревший код");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId: user!.id, type: "EMAIL_VERIFY" } }),
    prisma.user.update({ where: { id: user!.id }, data: { emailVerified: new Date() } }),
  ]);
  return ok({ ok: true });
});
