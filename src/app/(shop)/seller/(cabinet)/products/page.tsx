import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/products-table";
import { ListFilters } from "@/components/admin/list-filters";
import { Download } from "lucide-react";
import type { Prisma } from "@prisma/client";

export default async function SellerProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const sellerId = (await getCurrentUser())!.seller!.id;
  const where: Prisma.ProductWhereInput = { sellerId };
  if (sp.q) where.OR = [{ title: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }];
  if (sp.status) where.status = sp.status as never;
  if (sp.stock === "low") where.stock = { lte: 3 };
  const rows = await prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, slug: true, sku: true, price: true, oldPrice: true, stock: true, status: true, salesCount: true, category: { select: { name: true } }, brand: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } });
  return (
    <div>
      <div className="mb-2 flex flex-wrap justify-end gap-2"><a href="/api/seller/export?type=products&format=csv" className="btn-outline btn-sm"><Download size={14} />CSV</a><a href="/api/seller/export?type=products&format=xlsx" className="btn-outline btn-sm"><Download size={14} />Excel</a></div>
      <ListFilters placeholder="Название или артикул" selects={[{ name: "status", label: "Все статусы", options: [["PUBLISHED", "Опубликованные"], ["DRAFT", "На модерации / черновики"], ["HIDDEN", "Скрытые"]] }, { name: "stock", label: "Любой остаток", options: [["low", "Мало (≤ 3)"]] }]} />
      <p className="mb-3 text-sm text-ink-500">Новые товары и повторная публикация проходят модерацию администратором, если она включена.</p>
      <ProductsTable base="/seller/products" rows={rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, sku: r.sku, price: r.price, oldPrice: r.oldPrice, stock: r.stock, status: r.status, salesCount: r.salesCount, image: r.images[0]?.url ?? null, category: r.category.name, brand: r.brand?.name ?? null, seller: null }))} />
    </div>
  );
}
