import bcrypt from "bcryptjs";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registerSchema, phoneSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";
import { dbLimit } from "@/lib/rate-limit";
import { getGroup } from "@/lib/settings";
import { sendVerification } from "@/lib/auth-tokens";
import { notify, esc } from "@/lib/telegram";
import { audit } from "@/lib/audit";

export const POST = route({}, async (req, { ip }) => {
  const sec = await getGroup<{ authRateLimit: number }>("security");
  if (!(await dbLimit("register:" + ip, sec.authRateLimit, 10 * 60_000))) throw new ApiError(429, "Слишком много попыток. Попробуйте позже.");
  const reg = await getGroup<{ enabled: boolean; requirePhone: boolean }>("registration");
  if (!reg.enabled) throw new ApiError(403, "Регистрация временно закрыта");
  const authCfg = await getGroup<{ passwordMinLength: number; sessionDays: number }>("auth");
  const data = await body(req, registerSchema);
  if (data.password.length < authCfg.passwordMinLength) throw new ApiError(400, `Пароль должен быть не короче ${authCfg.passwordMinLength} символов`);
  let phone: string | null = null;
  if (data.phone) {
    const p = phoneSchema.safeParse(data.phone);
    if (!p.success) throw new ApiError(400, "Введите корректный номер телефона");
    phone = p.data;
  } else if (reg.requirePhone) throw new ApiError(400, "Укажите номер телефона");

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ApiError(409, "Аккаунт с таким email уже существует. Войдите или восстановите пароль.");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({ data: { name: data.name, email: data.email, phone, passwordHash } });
  await createSession(user, authCfg.sessionDays);
  const verification = await sendVerification(user, req.nextUrl.origin);
  await audit({ ...user, seller: null }, "register", "user", user.id, undefined, ip);
  notify("newUser", `👤 <b>Новый пользователь</b>\n${esc(user.name)} — ${esc(user.email)}${phone ? "\n" + esc(phone) : ""}`);
  return ok({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, verification });
});
