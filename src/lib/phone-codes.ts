import "server-only";
import { prisma } from "./prisma";
import { randomCode, sha256 } from "./crypto";
import { sendSms, smsConfigured } from "./sms";
import { getGroup } from "./settings";

export const normalizePhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  return "+" + (d.length === 11 && d.startsWith("8") ? "7" + d.slice(1) : d);
};
const hash = (phone: string, code: string) => sha256(`sms:${phone}:${code}`);

/** Creates and sends a 6-digit SMS code. Returns the code only in demo mode (no provider connected). */
export async function sendPhoneCode(phone: string, purpose = "register") {
  const code = randomCode(6);
  await prisma.phoneCode.updateMany({ where: { phone, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.phoneCode.create({ data: { phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  if (await smsConfigured()) {
    await sendSms(phone, `VITRINA: код подтверждения ${code}. Никому не сообщайте его.`);
    return { sent: true as const };
  }
  const cfg = await getGroup<{ devShowCode: boolean }>("sms");
  if (cfg.devShowCode) return { sent: false as const, devCode: code };
  throw new Error("Отправка SMS временно недоступна. Попробуйте позже.");
}

/** Verifies a code (single use, 10 minutes, max 5 attempts). */
export async function checkPhoneCode(phone: string, code: string, purpose = "register") {
  const rec = await prisma.phoneCode.findFirst({ where: { phone, purpose, usedAt: null }, orderBy: { createdAt: "desc" } });
  if (!rec || rec.expiresAt < new Date()) return "Код устарел — запросите новый";
  if (rec.attempts >= 5) return "Слишком много попыток — запросите новый код";
  if (rec.codeHash !== hash(phone, code)) {
    await prisma.phoneCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return "Неверный код из SMS";
  }
  await prisma.phoneCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return null;
}
