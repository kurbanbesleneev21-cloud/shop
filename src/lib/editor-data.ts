import "server-only";
import { prisma } from "./prisma";
import type { EditorCategory, EditorProduct } from "@/components/admin/product-editor";
import { asRecord, asStringArray } from "./utils";

export async function editorRefs(withSellers: boolean) {
  const [cats, brands, sellers] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, specTemplate: true, parent: { select: { name: true } } } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    withSellers ? prisma.seller.findMany({ where: { status: "APPROVED" }, orderBy: { shopName: "asc" }, select: { id: true, shopName: true } }) : Promise.resolve(null),
  ]);
  const categories: EditorCategory[] = cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name ?? null, specTemplate: (Array.isArray(c.specTemplate) ? c.specTemplate : []) as EditorCategory["specTemplate"] }));
  return { categories, brands, sellers };
}

export async function loadEditorProduct(id: string): Promise<(EditorProduct & { sellerOwner: string | null }) | null> {
  const p = await prisma.product.findUnique({ where: { id }, include: { images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } } });
  if (!p) return null;
  return {
    id: p.id, title: p.title, slug: p.slug, sku: p.sku, model: p.model ?? "", brandId: p.brandId ?? "", categoryId: p.categoryId, sellerId: p.sellerId ?? "",
    price: p.price, oldPrice: p.oldPrice ?? "", stock: p.stock, status: p.status, shortDescription: p.shortDescription ?? "", description: p.description ?? "",
    advantages: asStringArray(p.advantages), features: asStringArray(p.features), equipment: asStringArray(p.equipment), manufacturerInfo: p.manufacturerInfo ?? "",
    specs: asRecord(p.specs), isNew: p.isNew, isHit: p.isHit, featured: p.featured, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", keywords: p.keywords ?? "",
    images: p.images.map((i) => i.url), aiGenerated: p.aiGenerated, sellerOwner: p.sellerId,
  };
}
