import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const data = await body(req, z.object({
    status: z.enum(["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"]).optional(),
    note: z.string().trim().max(500).optional(),
    paymentStatus: z.enum(["pending", "paid", "refunded"]).optional(),
  }));
  const o = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!o) throw new ApiError(404, "Заказ не найден");
  if (data.status && data.status !== o.status) await changeOrderStatus(o.id, data.status, user, data.note, req.nextUrl.origin);
  else if (data.note) await prisma.orderEvent.create({ data: { orderId: o.id, status: o.status, note: data.note, actorId: user!.id, actorName: user!.name } });
  if (data.paymentStatus) await prisma.order.update({ where: { id: o.id }, data: { paymentStatus: data.paymentStatus } });
  await audit(user, "order.update", "order", o.id, data, ip);
  return ok();
});
