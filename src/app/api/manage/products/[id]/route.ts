import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { invalidateCatalog } from "@/lib/catalog";
import { productSchema } from "@/lib/validation";
import { deleteProduct, duplicateProduct, saveProduct } from "@/lib/product-service";
import { audit } from "@/lib/audit";

export const PUT = route<{ id: string }>({ auth: "seller" }, async (req, { user, params, ip }) => {
  const data = await body(req, productSchema);
  const r = await saveProduct(data, user!, params.id, ip);
  return ok({ ok: true, id: r.product.id, slug: r.product.slug, status: r.product.status, moderated: r.moderated });
});

// Quick actions: duplicate / status / price / stock
export const PATCH = route<{ id: string }>({ auth: "seller" }, async (req, { user, params }) => {
  const data = await body(req, z.object({ action: z.enum(["duplicate", "status", "quick"]), status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).optional(), price: z.coerce.number().int().min(1).optional(), oldPrice: z.coerce.number().int().min(0).nullable().optional(), stock: z.coerce.number().int().min(0).optional() }));
  if (data.action === "duplicate") {
    const copy = await duplicateProduct(params.id, user!);
    return ok({ ok: true, id: copy.id });
  }
  const p = await prisma.product.findUnique({ where: { id: params.id }, select: { sellerId: true, status: true, price: true } });
  if (!p) throw new ApiError(404, "Товар не найден");
  const isAdmin = user!.role === "ADMIN";
  if (!isAdmin && p.sellerId !== user!.seller?.id) throw new ApiError(403, "Это не ваш товар");
  const patch: Record<string, unknown> = {};
  if (data.status) {
    if (!isAdmin && data.status === "PUBLISHED" && p.status !== "PUBLISHED") {
      const s = await prisma.setting.findUnique({ where: { key: "sellers" } });
      const moderation = (s?.value as { productModeration?: boolean } | null)?.productModeration ?? true;
      if (moderation) throw new ApiError(403, "Публикация товаров продавцов проходит модерацию администратором");
    }
    patch.status = data.status;
  }
  if (data.price !== undefined) patch.price = data.price;
  if (data.oldPrice !== undefined) patch.oldPrice = data.oldPrice && data.oldPrice > (data.price ?? p.price) ? data.oldPrice : null;
  if (data.stock !== undefined) patch.stock = data.stock;
  await prisma.product.update({ where: { id: params.id }, data: patch });
  await audit(user, "product.quick", "product", params.id, patch);
  invalidateCatalog();
  return ok();
});

export const DELETE = route<{ id: string }>({ auth: "seller" }, async (_req, { user, params }) => {
  await deleteProduct(params.id, user!);
  return ok();
});
