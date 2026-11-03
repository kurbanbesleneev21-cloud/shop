import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { markPaymentCanceled, markPaymentSucceeded } from "@/lib/payments";
import { luhnValid } from "@/lib/payment-methods";
import { dbLimit } from "@/lib/rate-limit";

// Test acquiring: only works for payments created by the "test" provider. No real money is involved.
export const POST = route<{ id: string }>({}, async (req, { params, ip }) => {
  if (!(await dbLimit("testpay:" + ip, 60, 10 * 60_000))) throw new ApiError(429, "Слишком много попыток");
  const data = await body(req, z.object({ action: z.enum(["pay", "fail"]), card: z.string().max(30).optional(), exp: z.string().max(7).optional(), cvc: z.string().max(4).optional() }));
  const p = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!p || p.provider !== "test") throw new ApiError(404, "Платёж не найден");
  if (p.status !== "PENDING") throw new ApiError(409, "Платёж уже обработан");
  if (data.action === "fail") {
    await markPaymentCanceled(p.id, "Отменён покупателем");
    return ok({ status: "CANCELED" });
  }
  if (p.method === "platega_card" || p.method === "platega_intl") {
    const num = (data.card ?? "").replace(/\D/g, "");
    if (!luhnValid(num)) throw new ApiError(400, "Неверный номер карты");
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.exp ?? "")) throw new ApiError(400, "Срок действия в формате ММ/ГГ");
    const [mm, yy] = (data.exp ?? "").split("/").map(Number);
    if (new Date(2000 + yy, mm, 0, 23, 59) < new Date()) throw new ApiError(400, "Срок действия карты истёк");
    if (!/^\d{3,4}$/.test(data.cvc ?? "")) throw new ApiError(400, "Неверный CVC");
    if (num === "4000000000000002") {
      await markPaymentCanceled(p.id, "Банк отклонил операцию (тестовая карта)");
      throw new ApiError(402, "Банк отклонил операцию. Попробуйте другую карту.");
    }
  }
  await markPaymentSucceeded(p.id, { test: true, last4: (data.card ?? "").replace(/\D/g, "").slice(-4) || undefined });
  return ok({ status: "SUCCEEDED" });
});
