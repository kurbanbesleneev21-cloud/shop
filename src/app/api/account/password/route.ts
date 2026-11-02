import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";

export const POST = route({ auth: "user" }, async (req, { user }) => {
  const data = await body(req, z.object({ current: z.string().min(1), next: passwordSchema }));
  const u = await prisma.user.findUnique({ where: { id: user!.id } });
  if (!u || !(await bcrypt.compare(data.current, u.passwordHash))) throw new ApiError(400, "Текущий пароль указан неверно");
  const updated = await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(data.next, 12), tokenVersion: { increment: 1 } } });
  await createSession(updated); // keep this device signed in, sign out others
  return ok();
});
