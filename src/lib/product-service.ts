import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { invalidateCatalog } from "./catalog";
import { ApiError } from "./api";
import type { CurrentUser } from "./session";
import type { ProductInput } from "./validation";
import { slugify } from "./utils";
import { getGroup } from "./settings";
import { notify, esc } from "./telegram";
import { audit } from "./audit";
import { isAllowedImageUrl as allowedImage } from "./url-safety";

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i ? `${slug}-${i + 1}` : slug;
    const ex = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!ex || ex.id === excludeId) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

async function uniqueSku(sku: string | undefined, excludeId?: string) {
  if (sku) {
    const ex = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (ex && ex.id !== excludeId) throw new ApiError(409, `Артикул ${sku} уже используется`);
    return sku;
  }
  for (;;) {
    const s = "TM-" + Math.floor(100000 + Math.random() * 899999);
    if (!(await prisma.product.findUnique({ where: { sku: s }, select: { id: true } }))) return s;
  }
}


export async function saveProduct(input: ProductInput, user: CurrentUser, id?: string, ip?: string) {
  const isAdmin = user.role === "ADMIN";
  let existing = null;
  if (id) {
    existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Товар не найден");
    if (!isAdmin && existing.sellerId !== user.seller?.id) throw new ApiError(403, "Это не ваш товар");
  }
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) throw new ApiError(400, "Категория не найдена");
  if (input.brandId) {
    const b = await prisma.brand.findUnique({ where: { id: input.brandId }, select: { id: true } });
    if (!b) throw new ApiError(400, "Бренд не найден");
  }
  if (input.oldPrice && input.oldPrice <= input.price) input.oldPrice = null;
  const pc = await getGroup<{ maxPhotos: number }>("product");
  const images = (input.images ?? []).filter((i) => allowedImage(i.url)).slice(0, pc.maxPhotos);

  let status = input.status;
  let sellerId: string | null | undefined = input.sellerId || null;
  if (!isAdmin) {
    sellerId = user.seller!.id;
    const s = await getGroup<{ productModeration: boolean }>("sellers");
    // Sellers cannot self-publish when moderation is on: a published request becomes a draft awaiting approval
    if (s.productModeration && status === "PUBLISHED" && existing?.status !== "PUBLISHED") status = "DRAFT";
    input.isHit = existing?.isHit ?? false;
    input.featured = existing?.featured ?? false;
  } else if (sellerId) {
    const s = await prisma.seller.findUnique({ where: { id: sellerId }, select: { id: true } });
    if (!s) throw new ApiError(400, "Продавец не найден");
  }

  const slug = await uniqueSlug(input.slug || input.title, id);
  const sku = await uniqueSku(input.sku || undefined, id);
  const data = {
    title: input.title, slug, sku, model: input.model || null, brandId: input.brandId || null, categoryId: input.categoryId, sellerId,
    price: input.price, oldPrice: input.oldPrice || null, stock: input.stock, status,
    shortDescription: input.shortDescription || null, description: input.description || null,
    advantages: (input.advantages ?? []).filter(Boolean), features: (input.features ?? []).filter(Boolean), equipment: (input.equipment ?? []).filter(Boolean),
    manufacturerInfo: input.manufacturerInfo || null, specs: Object.fromEntries(Object.entries(input.specs ?? {}).filter(([k, v]) => k.trim() && String(v).trim())),
    color: input.color || null, memory: input.memory || null, diagonal: input.diagonal || null, processor: input.processor || null,
    isNew: input.isNew, isHit: input.isHit, featured: input.featured,
    seoTitle: input.seoTitle || null, seoDescription: input.seoDescription || null, keywords: input.keywords || null,
    ...(input.aiGenerated !== undefined ? { aiGenerated: input.aiGenerated } : {}),
  };

  const product = await prisma.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    await tx.productImage.deleteMany({ where: { productId: p.id } });
    if (images.length) await tx.productImage.createMany({ data: images.map((im, i) => ({ productId: p.id, url: im.url, alt: im.alt || `${input.title} — фото ${i + 1}`, sortOrder: i, isMain: i === 0 })) });
    return p;
  });

  await audit(user, id ? "product.update" : "product.create", "product", product.id, { title: product.title, status: product.status, price: product.price }, ip);
  if (!id) notify("newProduct", `🆕 <b>Новый товар</b>\n${esc(product.title)} — ${product.price} ₽\nСтатус: ${product.status}${!isAdmin ? "\nПродавец: " + esc(user.seller?.shopName) : ""}`);
  revalidatePath(`/product/${product.slug}`);
  invalidateCatalog();
  if (existing && existing.slug !== product.slug) revalidatePath(`/product/${existing.slug}`);
  return { product, moderated: !isAdmin && status !== input.status };
}

export async function duplicateProduct(id: string, user: CurrentUser) {
  const p = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!p) throw new ApiError(404, "Товар не найден");
  if (user.role !== "ADMIN" && p.sellerId !== user.seller?.id) throw new ApiError(403, "Это не ваш товар");
  const { id: _i, createdAt: _c, updatedAt: _u, images, rating: _r, reviewsCount: _rc, salesCount: _s, viewsCount: _v, ...rest } = p;
  const copy = await prisma.product.create({
    data: {
      ...rest,
      advantages: rest.advantages ?? [], features: rest.features ?? [], equipment: rest.equipment ?? [], specs: rest.specs ?? {},
      title: p.title + " (копия)", slug: await uniqueSlug(p.title + " копия"), sku: await uniqueSku(undefined), status: "DRAFT",
      images: { create: images.map((im) => ({ url: im.url, alt: im.alt, sortOrder: im.sortOrder, isMain: im.isMain })) },
    },
  });
  await audit(user, "product.duplicate", "product", copy.id, { from: id });
  return copy;
}

export async function deleteProduct(id: string, user: CurrentUser) {
  const p = await prisma.product.findUnique({ where: { id }, select: { sellerId: true, title: true, slug: true, _count: { select: { orderItems: true } } } });
  if (!p) throw new ApiError(404, "Товар не найден");
  if (user.role !== "ADMIN" && p.sellerId !== user.seller?.id) throw new ApiError(403, "Это не ваш товар");
  await prisma.product.delete({ where: { id } });
  await audit(user, "product.delete", "product", id, { title: p.title });
  invalidateCatalog();
  revalidatePath(`/product/${p.slug}`);
}
