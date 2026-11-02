import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";

// Customer actions on own order: cancel (before shipping) or request a return (after delivery)
export const POST = route<{ id: string }>({ auth: "user" }, async (req, { user, params }) => {
  const { action, reason } = await body(req, z.object({ action: z.enum(["cancel", "return"]), reason: z.string().trim().max(500).optional() }));
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.userId !== user!.id) throw new ApiError(404, "Заказ не найден");
  if (action === "cancel") {
    if (!["NEW", "CONFIRMED", "PAID"].includes(order.status)) throw new ApiError(400, "Заказ уже передан в доставку — отменить нельзя");
    await changeOrderStatus(order.id, "CANCELLED", user, reason ? `Отменён покупателем: ${reason}` : "Отменён покупателем", req.nextUrl.origin);
  } else {
    if (order.status !== "DELIVERED") throw new ApiError(400, "Возврат доступен только для полученных заказов");
    if (Date.now() - order.updatedAt.getTime() > 30 * 86400_000) throw new ApiError(400, "Срок возврата истёк");
    await changeOrderStatus(order.id, "RETURN_REQUESTED", user, reason ? `Причина возврата: ${reason}` : "Запрошен возврат", req.nextUrl.origin);
  }
  return ok();
});
