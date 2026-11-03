import { route, ok, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbLimit } from "@/lib/rate-limit";
import { notify, esc } from "@/lib/telegram";
import { formatPrice } from "@/lib/utils";

// Buyer reports a Kaspi payment. The order becomes "paid" only after the administrator checks Kaspi Pay and confirms it.
export const POST = route<{ id: string }>({}, async (_req, { params, ip }) => {
  if (!(await dbLimit("kaspi:" + ip, 20, 60 * 60_000))) throw new ApiError(429, "Слишком много запросов");
  const p = await prisma.payment.findUnique({ where: { id: params.id }, include: { order: { select: { number: true, recipientName: true, phone: true } } } });
  if (!p || p.provider !== "kaspi") throw new ApiError(404, "Платёж не найден");
  if (p.status === "PENDING") {
    await prisma.payment.update({ where: { id: p.id }, data: { status: "WAITING" } });
    await prisma.orderEvent.create({ data: { orderId: p.orderId, status: "NEW", note: "Покупатель сообщил об оплате через Kaspi — проверьте поступление и подтвердите оплату" } });
    notify("newOrder", `🟥 <b>Kaspi: оплата заказа №${p.order.number}</b>\n${formatPrice(p.amount)} · ${esc(p.order.recipientName)}, ${esc(p.order.phone)}\nПроверьте поступление в Kaspi Pay и подтвердите оплату в админке.`);
  }
  return ok({ status: p.status === "PENDING" ? "WAITING" : p.status });
});
