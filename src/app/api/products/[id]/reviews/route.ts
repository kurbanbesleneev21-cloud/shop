import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validation";
import { getGroup } from "@/lib/settings";
import { notify, esc } from "@/lib/telegram";
import { recalcRating } from "@/lib/reviews";

export const POST = route<{ id: string }>({ auth: "user" }, async (req, { user, params }) => {
  const users = await getGroup<{ allowReviews: boolean }>("users");
  if (!users.allowReviews) throw new ApiError(403, "Отзывы временно отключены");
  const data = await body(req, reviewSchema);
  const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true, title: true } });
  if (!product) throw new ApiError(404, "Товар не найден");
  // Verified purchase only: the user must have a delivered order containing this product
  const purchase = await prisma.orderItem.findFirst({ where: { productId: product.id, order: { userId: user!.id, status: "DELIVERED" } }, select: { orderId: true } });
  if (!purchase) throw new ApiError(403, "Оставить отзыв можно только после получения заказа с этим товаром");
  const exists = await prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId: user!.id } } });
  if (exists) throw new ApiError(409, "Вы уже оставили отзыв на этот товар");
  const pc = await getGroup<{ reviewPremoderation: boolean; reviewPhotos: boolean }>("product");
  const photos = pc.reviewPhotos ? (data.photos ?? []).filter((u) => u.startsWith("/api/media/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(u)) : [];
  const review = await prisma.review.create({
    data: { productId: product.id, userId: user!.id, orderId: purchase.orderId, rating: data.rating, text: data.text, pros: data.pros || null, cons: data.cons || null, photos, status: pc.reviewPremoderation ? "PENDING" : "APPROVED" },
  });
  if (review.status === "APPROVED") await recalcRating(product.id);
  notify("newReview", `⭐ <b>Новый отзыв</b> (${data.rating}/5)\n${esc(product.title)}\n${esc(user!.name)}: ${esc(data.text.slice(0, 300))}`);
  return ok({ ok: true, status: review.status });
});
