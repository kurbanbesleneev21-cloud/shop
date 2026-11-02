import Link from "next/link";
import { Plus, Bot } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ProductsTable } from "@/components/admin/products-table";
import { ListFilters, Pager } from "@/components/admin/list-filters";

export const metadata = { title: "Товары" };
const PER = 30;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ title: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }];
  if (sp.status) where.status = sp.status as never;
  if (sp.category) where.categoryId = sp.category;
  if (sp.seller) where.sellerId = sp.seller;
  if (sp.stock === "low") where.stock = { lte: 3 };
  const [rows, total, cats, sellers, counts] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, title: true, slug: true, sku: true, price: true, oldPrice: true, stock: true, status: true, salesCount: true, category: { select: { name: true } }, brand: { select: { name: true } }, seller: { select: { shopName: true } }, images: { take: 1, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], select: { url: true } } } }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.seller.findMany({ orderBy: { shopName: "asc" }, select: { id: true, shopName: true } }),
    prisma.product.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  return (
    <div>
      <PageHeader
        title="Товары"
        subtitle={`Всего ${total} · опубликовано ${c("PUBLISHED")} · черновики ${c("DRAFT")} · скрыто ${c("HIDDEN")}`}
        actions={<div className="flex gap-2"><Link href="/admin/ai" className="btn-outline"><Bot size={18} />AI-карточка</Link><Link href="/admin/products/new" className="btn-primary"><Plus size={18} />Добавить товар</Link></div>}
      />
      <ListFilters
        placeholder="Название или артикул"
        selects={[
          { name: "status", label: "Все статусы", options: [["PUBLISHED", "Опубликованные"], ["DRAFT", "Черновики (модерация)"], ["HIDDEN", "Скрытые"]] },
          { name: "category", label: "Все категории", options: cats.map((x) => [x.id, x.name]) },
          { name: "seller", label: "Все продавцы", options: sellers.map((x) => [x.id, x.shopName]) },
          { name: "stock", label: "Любой остаток", options: [["low", "Мало (≤ 3)"]] },
        ]}
      />
      <ProductsTable base="/admin/products" rows={rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, sku: r.sku, price: r.price, oldPrice: r.oldPrice, stock: r.stock, status: r.status, salesCount: r.salesCount, image: r.images[0]?.url ?? null, category: r.category.name, brand: r.brand?.name ?? null, seller: r.seller?.shopName ?? null }))} />
      <Pager page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
