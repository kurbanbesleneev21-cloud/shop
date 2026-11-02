import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { dbLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/auth-tokens";
import { button, sendEmail } from "@/lib/email";
import { getGroup } from "@/lib/settings";

export const POST = route({}, async (req, { ip }) => {
  if (!(await dbLimit("forgot:" + ip, 10, 60 * 60_000))) throw new ApiError(429, "Слишком много запросов, попробуйте позже");
  const { email } = await body(req, z.object({ email: emailSchema }));
  const user = await prisma.user.findUnique({ where: { email } });
  let devLink: string | undefined;
  if (user && !user.blocked) {
    const token = await issueToken(user.id, "PASSWORD_RESET", 2);
    const link = `${req.nextUrl.origin}/auth/reset?token=${token}`;
    const sent = await sendEmail(email, "Восстановление пароля", "Восстановление пароля", `<p>Вы запросили смену пароля. Нажмите кнопку, чтобы задать новый пароль.</p>${button(link, "Задать новый пароль")}<p>Ссылка действует 2 часа. Если это были не вы — просто проигнорируйте письмо.</p>`);
    const cfg = await getGroup<{ devShowLinks: boolean }>("email");
    if (!sent && cfg.devShowLinks) devLink = link;
  }
  // Same response regardless of whether the account exists (prevents email enumeration)
  return ok({ ok: true, devLink });
});
