import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { BrandsManager } from "@/components/admin/managers";

export const metadata = { title: "Бренды" };

export default async function Brands() {
  const brands = await prisma.brand.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <div>
      <PageHeader title="Бренды" subtitle="Производители и популярные бренды на главной" />
      <BrandsManager items={brands.map(({ _count, createdAt, ...b }) => ({ ...b, productCount: _count.products, createdAt: createdAt.toISOString() }))} />
    </div>
  );
}
