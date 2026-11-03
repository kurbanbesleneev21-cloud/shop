import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbLimit } from "@/lib/rate-limit";
import { randomCode, sha256 } from "@/lib/crypto";
import { sendSms, smsConfigured } from "@/lib/sms";

// POST {action:"send"} -> sends SMS code; POST {action:"verify", code} -> verifies
export const POST = route({ auth: "user" }, async (req, { user }) => {
  const data = await body(req, z.object({ action: z.enum(["send", "verify"]), code: z.string().max(10).optional() }));
  if (!user!.phone) throw new ApiError(400, "Сначала укажите телефон в профиле");
  if (!(await smsConfigured())) throw new ApiError(400, "SMS-провайдер не подключён администратором");
  if (data.action === "send") {
    if (!(await dbLimit("sms:" + user!.id, 3, 30 * 60_000))) throw new ApiError(429, "Слишком много SMS. Попробуйте через 30 минут");
    const code = randomCode(6);
    await prisma.verificationToken.deleteMany({ where: { userId: user!.id, type: "PHONE_CODE" } });
    await prisma.verificationToken.create({
      data: { userId: user!.id, type: "PHONE_CODE", tokenHash: sha256(user!.id + ":" + code), expiresAt: new Date(Date.now() + 10 * 60_000) },
    });
    await sendSms(user!.phone, `Код подтверждения VITRINA: ${code}`);
    return ok({ ok: true });
  }
  const rec = await prisma.verificationToken.findFirst({ where: { userId: user!.id, type: "PHONE_CODE", usedAt: null } });
  if (!rec || rec.expiresAt < new Date()) throw new ApiError(400, "Код устарел, запросите новый");
  if (rec.attempts >= 5) throw new ApiError(429, "Превышено число попыток, запросите новый код");
  if (rec.tokenHash !== sha256(user!.id + ":" + (data.code ?? ""))) {
    await prisma.verificationToken.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "Неверный код");
  }
  await prisma.verificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: user!.id }, data: { phoneVerified: new Date() } });
  return ok({ ok: true });
});
