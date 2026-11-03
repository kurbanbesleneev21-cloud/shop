import "server-only";
import { prisma } from "./prisma";
import { randomCode, randomToken, sha256 } from "./crypto";
import { button, sendEmail } from "./email";
import { getGroup } from "./settings";

export async function issueToken(userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET", hours: number) {
  await prisma.verificationToken.deleteMany({ where: { userId, type } });
  const token = randomToken();
  await prisma.verificationToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hours * 3600_000) },
  });
  return token;
}

export async function consumeToken(token: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
  const rec = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.type !== type || rec.usedAt || rec.expiresAt < new Date()) return null;
  await prisma.verificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return rec;
}

/** Sends verification email; returns a dev link when email is not configured and demo links are enabled. */
export const codeHash = (userId: string, code: string) => sha256(`email-code:${userId}:${code}`);

/** Sends a verification email with a 6-digit code and a link (both single-use). */
export async function sendVerification(user: { id: string; email: string; name: string }, origin: string) {
  const token = await issueToken(user.id, "EMAIL_VERIFY", 48);
  const code = randomCode(6);
  await prisma.verificationToken.create({ data: { userId: user.id, type: "EMAIL_VERIFY", tokenHash: codeHash(user.id, code), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const link = `${origin}/auth/verify?token=${token}`;
  const sent = await sendEmail(
    user.email,
    `Код подтверждения: ${code}`,
    `${user.name}, подтвердите адрес электронной почты`,
    `<p>Ваш код подтверждения:</p><p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p><p>Код действует 30 минут. Или нажмите кнопку:</p>${button(link, "Подтвердить email")}<p>Если вы не регистрировались — просто проигнорируйте письмо.</p>`,
  );
  const cfg = await getGroup<{ devShowLinks: boolean }>("email");
  const demo = !sent && cfg.devShowLinks;
  return { sent, devLink: demo ? link : undefined, devCode: demo ? code : undefined };
}
