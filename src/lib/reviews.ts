import "server-only";
import { prisma } from "./prisma";

export async function recalcRating(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: productId }, data: { rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, reviewsCount: agg._count } });
}
