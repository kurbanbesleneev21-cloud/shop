import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/payments";
import { PAYMENT_KEYS, methodDef } from "@/lib/payment-methods";
import { paymentsCfg } from "@/lib/payments";

// Buyer pays (again) for own unpaid order, optionally switching the payment method
export const POST = route<{ id: string }>({ auth: "user" }, async (req, { user, params }) => {
  const { method } = await body(req, z.object({ method: z.enum(PAYMENT_KEYS as [string, ...string[]]).optional() }));
  const o = await prisma.order.findUnique({ where: { id: params.id } });
  if (!o || o.userId !== user!.id) throw new ApiError(404, "Заказ не найден");
  if (o.paymentStatus === "paid") throw new ApiError(409, "Заказ уже оплачен");
  if (o.status !== "NEW") throw new ApiError(409, "Заказ нельзя оплатить в текущем статусе");
  if (method && method !== o.paymentMethod) {
    const cfg = await paymentsCfg();
    const def = methodDef(method)!;
    if (cfg[method] === false || (cfg[method] === undefined && !def.defaultEnabled)) throw new ApiError(400, "Способ оплаты недоступен");
    if (method === "invoice") throw new ApiError(400, "Оплату по счёту выбирают при оформлении заказа");
    await prisma.order.update({ where: { id: o.id }, data: { paymentMethod: method } });
  }
  await prisma.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELED", error: "Создана новая попытка оплаты" } });
  return ok(await createPayment(o.id, req.nextUrl.origin));
});
