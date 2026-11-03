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
import { isDisposableEmail, passwordProblem } from "@/lib/registration";

export const POST = route({}, async (req, { ip }) => {
  const sec = await getGroup<{ authRateLimit: number }>("security");
  if (!(await dbLimit("register:" + ip, sec.authRateLimit, 10 * 60_000))) throw new ApiError(429, "Слишком много попыток. Попробуйте позже.");
  const reg = await getGroup<{ enabled: boolean; requirePhone: boolean }>("registration");
  if (!reg.enabled) throw new ApiError(403, "Регистрация временно закрыта");
  const authCfg = await getGroup<{ passwordMinLength: number; sessionDays: number }>("auth");
  const data = await body(req, registerSchema);
  if (data.website) throw new ApiError(400, "Не удалось зарегистрироваться"); // bot filled the honeypot
  const pwErr = passwordProblem(data.password, { email: data.email, name: data.name, minLength: authCfg.passwordMinLength });
  if (pwErr) throw new ApiError(400, pwErr, { fields: { password: [pwErr] } });
  if (isDisposableEmail(data.email)) throw new ApiError(400, "Одноразовые почтовые ящики не поддерживаются — укажите постоянный email");
  let phone: string | null = null;
  if (data.phone) {
    const p = phoneSchema.safeParse(data.phone);
    if (!p.success) throw new ApiError(400, "Введите корректный номер телефона");
    phone = p.data;
  } else if (reg.requirePhone) throw new ApiError(400, "Укажите номер телефона");

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ApiError(409, "Аккаунт с таким email уже существует. Войдите или восстановите пароль.");
  if (phone && (await prisma.user.findFirst({ where: { phone }, select: { id: true } }))) throw new ApiError(409, "Этот номер телефона уже привязан к другому аккаунту");

  const passwordHash = await bcrypt.hash(data.password, 12);
  let user;
  try {
    user = await prisma.user.create({ data: { name: data.name.replace(/\s+/g, " "), email: data.email, phone, passwordHash } });
  } catch {
    // unique constraint race: two simultaneous registrations with the same email
    throw new ApiError(409, "Аккаунт с таким email уже существует. Войдите или восстановите пароль.");
  }
  await createSession(user, authCfg.sessionDays);
  const verification = await sendVerification(user, req.nextUrl.origin);
  await audit({ ...user, seller: null }, "register", "user", user.id, undefined, ip);
  notify("newUser", `👤 <b>Новый пользователь</b>\n${esc(user.name)} — ${esc(user.email)}${phone ? "\n" + esc(phone) : ""}`);
  return ok({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, verification, next: data.accountType === "seller" ? "/seller/register" : undefined });
});
