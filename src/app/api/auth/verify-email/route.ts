import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/auth-tokens";

export const POST = route({}, async (req) => {
  const { token } = await body(req, z.object({ token: z.string().min(10).max(200) }));
  const rec = await consumeToken(token, "EMAIL_VERIFY");
  if (!rec) throw new ApiError(400, "Ссылка недействительна или устарела");
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) throw new ApiError(404, "Пользователь не найден");
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return ok({ ok: true, email: user.email });
});
