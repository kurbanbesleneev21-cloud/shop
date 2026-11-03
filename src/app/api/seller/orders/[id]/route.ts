import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";

// Sellers manage orders that consist only of their own items (mixed orders are handled by the marketplace)
const FLOW: Record<string, string[]> = {
  CONFIRMED: ["NEW"],
  SHIPPED: ["NEW", "CONFIRMED", "PAID"],
  DELIVERED: ["SHIPPED"],
  CANCELLED: ["NEW", "CONFIRMED", "PAID"],
  RETURNED: ["RETURN_REQUESTED"],
};

export const PATCH = route<{ id: string }>({ auth: "seller" }, async (req, { user, params }) => {
  const data = await body(req, z.object({
    status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
    trackingNumber: z.string().trim().max(60).optional(),
    reason: z.string().trim().max(500).optional(),
  }));
  const sellerId = user!.seller?.id;
  const o = await prisma.order.findUnique({ where: { id: params.id }, include: { items: { select: { sellerId: true } } } });
  if (!o || !sellerId || !o.items.some((i) => i.sellerId === sellerId)) throw new ApiError(404, "Заказ не найден");
  if (o.items.some((i) => i.sellerId !== sellerId)) throw new ApiError(403, "Заказ содержит товары других продавцов — статус меняет маркетплейс");
  if (!FLOW[data.status].includes(o.status)) throw new ApiError(400, "Нельзя изменить статус на этом этапе");
  if (data.status === "SHIPPED" && o.paymentStatus !== "paid" && !["cash", "card_on_delivery"].includes(o.paymentMethod)) throw new ApiError(400, "Заказ ещё не оплачен покупателем — отгрузка невозможна");
  if (data.status === "SHIPPED" && o.deliveryMethod !== "pickup" && !data.trackingNumber) throw new ApiError(400, "Укажите трек-номер отправления");
  if (data.status === "CANCELLED" && !data.reason) throw new ApiError(400, "Укажите причину отмены");
  if (data.trackingNumber) await prisma.order.update({ where: { id: o.id }, data: { trackingNumber: data.trackingNumber } });
  const notes: Record<string, string> = {
    CONFIRMED: "Подтверждён продавцом",
    SHIPPED: `Передан продавцом в доставку${data.trackingNumber ? `, трек-номер ${data.trackingNumber}` : ""}`,
    DELIVERED: "Доставлен (подтверждено продавцом)",
    CANCELLED: `Отменён продавцом: ${data.reason}`,
    RETURNED: "Возврат принят продавцом",
  };
  await changeOrderStatus(o.id, data.status, user, notes[data.status], req.nextUrl.origin);
  return ok();
});
