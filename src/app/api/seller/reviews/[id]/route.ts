import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Seller replies to a review of own product
export const POST = route<{ id: string }>({ auth: "seller" }, async (req, { user, params }) => {
  const { reply } = await body(req, z.object({ reply: z.string().trim().min(2, "Ответ слишком короткий").max(2000) }));
  const r = await prisma.review.findUnique({ where: { id: params.id }, include: { product: { select: { sellerId: true } } } });
  if (!r || r.product.sellerId !== user!.seller?.id) throw new ApiError(404, "Отзыв не найден");
  await prisma.review.update({ where: { id: r.id }, data: { reply, replyAt: new Date() } });
  return ok();
});
