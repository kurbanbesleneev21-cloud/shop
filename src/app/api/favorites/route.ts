import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cardSelect } from "@/lib/catalog";

const schema = z.object({ productId: z.string().min(5).max(40) });

export const GET = route({ auth: "user" }, async (_req, { user }) => {
  const favs = await prisma.favorite.findMany({ where: { userId: user!.id }, orderBy: { createdAt: "desc" }, select: { product: { select: cardSelect } } });
  return ok({ items: favs.map((f) => f.product) });
});

export const POST = route({ auth: "user" }, async (req, { user }) => {
  const { productId } = await body(req, schema);
  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) throw new ApiError(404, "Товар не найден");
  await prisma.favorite.upsert({ where: { userId_productId: { userId: user!.id, productId } }, create: { userId: user!.id, productId }, update: {} });
  return ok();
});

export const DELETE = route({ auth: "user" }, async (req, { user }) => {
  const { productId } = await body(req, schema);
  await prisma.favorite.deleteMany({ where: { userId: user!.id, productId } });
  return ok();
});
