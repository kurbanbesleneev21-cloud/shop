import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/products-table";

export default async function SellerProducts() {
  const sellerId = (await getCurrentUser())!.seller!.id;
  const rows = await prisma.product.findMany({ where: { sellerId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, slug: true, sku: true, price: true, oldPrice: true, stock: true, status: true, salesCount: true, category: { select: { name: true } }, brand: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } });
  return (
    <div>
      <p className="mb-3 text-sm text-ink-500">Новые товары и повторная публикация проходят модерацию администратором, если она включена.</p>
      <ProductsTable base="/seller/products" rows={rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, sku: r.sku, price: r.price, oldPrice: r.oldPrice, stock: r.stock, status: r.status, salesCount: r.salesCount, image: r.images[0]?.url ?? null, category: r.category.name, brand: r.brand?.name ?? null, seller: null }))} />
    </div>
  );
}
