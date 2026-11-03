import { route, ok, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { syncPayment, createPayment } from "@/lib/payments";

// Status for the return page (payment id is an unguessable cuid shared only with the buyer)
export const GET = route<{ id: string }>({}, async (_req, { params }) => {
  const p = await syncPayment(params.id).catch(() => prisma.payment.findUnique({ where: { id: params.id } }));
  if (!p) throw new ApiError(404, "Платёж не найден");
  const o = await prisma.order.findUnique({ where: { id: p.orderId }, select: { id: true, number: true, status: true, userId: true } });
  return ok({ status: p.status, orderNumber: o?.number, orderId: o?.userId ? o.id : null, orderStatus: o?.status, error: p.error });
});

// Retry: create a new payment attempt for the same unpaid order
export const POST = route<{ id: string }>({}, async (req, { params }) => {
  const p = await prisma.payment.findUnique({ where: { id: params.id }, include: { order: true } });
  if (!p) throw new ApiError(404, "Платёж не найден");
  if (p.order.paymentStatus === "paid") throw new ApiError(409, "Заказ уже оплачен");
  if (p.order.status !== "NEW") throw new ApiError(409, "Заказ нельзя оплатить");
  const r = await createPayment(p.orderId, req.nextUrl.origin);
  return ok(r);
});
