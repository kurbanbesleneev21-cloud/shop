import "server-only";
import { prisma } from "./prisma";
import { randomToken, sha256 } from "./crypto";
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
export async function sendVerification(user: { id: string; email: string; name: string }, origin: string) {
  const token = await issueToken(user.id, "EMAIL_VERIFY", 48);
  const link = `${origin}/auth/verify?token=${token}`;
  const sent = await sendEmail(
    user.email,
    "Подтвердите email",
    `${user.name}, подтвердите адрес электронной почты`,
    `<p>Чтобы завершить регистрацию, подтвердите адрес электронной почты.</p>${button(link, "Подтвердить email")}<p>Ссылка действует 48 часов.</p>`,
  );
  const cfg = await getGroup<{ devShowLinks: boolean }>("email");
  return { sent, devLink: !sent && cfg.devShowLinks ? link : undefined };
}
