import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation";
import { consumeToken } from "@/lib/auth-tokens";

export const POST = route({}, async (req) => {
  const { token, password } = await body(req, z.object({ token: z.string().min(10).max(200), password: passwordSchema }));
  const rec = await consumeToken(token, "PASSWORD_RESET");
  if (!rec) throw new ApiError(400, "Ссылка недействительна или устарела");
  await prisma.user.update({
    where: { id: rec.userId },
    data: { passwordHash: await bcrypt.hash(password, 12), tokenVersion: { increment: 1 }, emailVerified: new Date() },
  });
  return ok({ ok: true });
});
