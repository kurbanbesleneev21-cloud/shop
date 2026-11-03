import bcrypt from "bcryptjs";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";
import { dbLimit, resetLimit } from "@/lib/rate-limit";
import { getGroup } from "@/lib/settings";

export const POST = route({}, async (req, { ip }) => {
  const sec = await getGroup<{ authRateLimit: number }>("security");
  const authCfg = await getGroup<{ maxLoginAttempts: number; lockMinutes: number; sessionDays: number }>("auth");
  if (!(await dbLimit("login-ip:" + ip, sec.authRateLimit, 10 * 60_000))) throw new ApiError(429, "Слишком много попыток входа. Попробуйте позже.");
  const data = await body(req, loginSchema);
  const key = "login-acc:" + data.email + ":" + ip; // per email+IP, so a stranger cannot lock the owner out
  const allowed = await dbLimit(key, authCfg.maxLoginAttempts, authCfg.lockMinutes * 60_000);
  if (!allowed) throw new ApiError(429, `Вход временно заблокирован на ${authCfg.lockMinutes} мин. из-за неверных попыток.`);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const valid = user ? await bcrypt.compare(data.password, user.passwordHash) : await bcrypt.compare(data.password, "$2b$12$coq1b9yrA2Ekw.5lGynTqeJ8ttL.xGlc2p4cErUIB/DzDIHxpo/u.");
  if (!user || !valid) throw new ApiError(401, "Неверный email или пароль");
  if (user.blocked) throw new ApiError(403, "Аккаунт заблокирован" + (user.blockReason ? `: ${user.blockReason}` : ""));
  await resetLimit(key);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user, authCfg.sessionDays);
  return ok({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
