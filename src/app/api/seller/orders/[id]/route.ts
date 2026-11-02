import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";

// Sellers can confirm and ship orders that consist only of their own items
export const PATCH = route<{ id: string }>({ auth: "seller" }, async (req, { user, params }) => {
  const { status } = await body(req, z.object({ status: z.enum(["CONFIRMED", "SHIPPED"]) }));
  const sellerId = user!.seller?.id;
  const o = await prisma.order.findUnique({ where: { id: params.id }, include: { items: { select: { sellerId: true } } } });
  if (!o || !sellerId || !o.items.some((i) => i.sellerId === sellerId)) throw new ApiError(404, "Заказ не найден");
  if (o.items.some((i) => i.sellerId !== sellerId)) throw new ApiError(403, "Заказ содержит товары других продавцов — статус меняет маркетплейс");
  const allowed = status === "CONFIRMED" ? ["NEW"] : ["NEW", "CONFIRMED", "PAID"];
  if (!allowed.includes(o.status)) throw new ApiError(400, "Нельзя изменить статус на этом этапе");
  await changeOrderStatus(o.id, status, user, status === "SHIPPED" ? "Передан продавцом в доставку" : "Подтверждён продавцом", req.nextUrl.origin);
  return ok();
});
