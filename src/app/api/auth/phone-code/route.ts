import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbLimit } from "@/lib/rate-limit";
import { phoneSchema } from "@/lib/validation";
import { normalizePhone, sendPhoneCode } from "@/lib/phone-codes";

// Sends an SMS code to the phone number entered in the registration form
export const POST = route({}, async (req, { ip }) => {
  const { phone: raw } = await body(req, z.object({ phone: phoneSchema }));
  const phone = normalizePhone(raw);
  if (!/^\+7\d{10}$/.test(phone) && !/^\+\d{11,15}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона");
  if (!(await dbLimit("sms-ip:" + ip, 10, 60 * 60_000))) throw new ApiError(429, "Слишком много SMS с вашего устройства. Попробуйте через час.");
  if (!(await dbLimit("sms-cool:" + phone, 1, 60_000))) throw new ApiError(429, "Новый код можно запросить через минуту");
  if (!(await dbLimit("sms-phone:" + phone, 5, 60 * 60_000))) throw new ApiError(429, "Слишком много запросов кода на этот номер");
  if (await prisma.user.findFirst({ where: { phone }, select: { id: true } })) throw new ApiError(409, "Этот номер уже зарегистрирован. Войдите в аккаунт.");
  try {
    return ok(await sendPhoneCode(phone));
  } catch (e) {
    throw new ApiError(503, (e as Error).message);
  }
});
