import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { markPaymentSucceeded, refundOrder, syncPayment } from "@/lib/payments";
import { randomToken } from "@/lib/crypto";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const data = await body(req, z.object({
    status: z.enum(["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"]).optional(),
    note: z.string().trim().max(500).optional(),
    paymentStatus: z.enum(["pending", "paid", "refunded"]).optional(),
    action: z.enum(["confirmPayment", "refund", "syncPayment", "tracking"]).optional(),
    amount: z.coerce.number().int().min(1).optional(),
    trackingNumber: z.string().trim().max(60).optional(),
  }));
  const o = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true, status: true, total: true, paymentMethod: true } });
  if (!o) throw new ApiError(404, "Заказ не найден");
  if (data.action) {
    if (data.action === "confirmPayment") {
      let p = await prisma.payment.findFirst({ where: { orderId: o.id, status: { in: ["PENDING", "WAITING"] } }, orderBy: { createdAt: "desc" } });
      if (!p) p = await prisma.payment.create({ data: { orderId: o.id, method: o.paymentMethod, provider: "manual", amount: o.total, idempotenceKey: randomToken(18) } });
      await markPaymentSucceeded(p.id, { confirmedBy: user!.email });
    } else if (data.action === "refund") {
      try {
        const r = await refundOrder(o.id, data.amount);
        await prisma.orderEvent.create({ data: { orderId: o.id, status: o.status, note: r.refunded ? `Возврат средств ${r.refunded} ₽: ${r.note}` : r.note, actorId: user!.id, actorName: user!.name } });
      } catch (e) {
        throw new ApiError(502, (e as Error).message);
      }
    } else if (data.action === "syncPayment") {
      const pend = await prisma.payment.findMany({ where: { orderId: o.id, status: "PENDING" } });
      for (const p of pend) await syncPayment(p.id).catch(() => undefined);
    } else if (data.action === "tracking") {
      await prisma.order.update({ where: { id: o.id }, data: { trackingNumber: data.trackingNumber || null } });
      if (data.trackingNumber) await prisma.orderEvent.create({ data: { orderId: o.id, status: o.status, note: `Трек-номер: ${data.trackingNumber}`, actorId: user!.id, actorName: user!.name } });
    }
    await audit(user, `order.${data.action}`, "order", o.id, data, ip);
    return ok();
  }
  if (data.status && data.status !== o.status) await changeOrderStatus(o.id, data.status, user, data.note, req.nextUrl.origin);
  else if (data.note) await prisma.orderEvent.create({ data: { orderId: o.id, status: o.status, note: data.note, actorId: user!.id, actorName: user!.name } });
  if (data.paymentStatus) await prisma.order.update({ where: { id: o.id }, data: { paymentStatus: data.paymentStatus } });
  await audit(user, "order.update", "order", o.id, data, ip);
  return ok();
});
