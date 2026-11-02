import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { CategoriesManager } from "@/components/admin/managers";

export const metadata = { title: "Категории" };

export default async function Categories() {
  const cats = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: { select: { name: true } }, _count: { select: { products: true } } } });
  const items = cats.map(({ parent, _count, createdAt, updatedAt, ...c }) => ({ ...c, parentId: c.parentId ?? "", parentName: parent?.name ?? null, productCount: _count.products, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() }));
  return (
    <div>
      <PageHeader title="Категории" subtitle="Иерархия каталога, иконки, фото, порядок и шаблоны характеристик" />
      <CategoriesManager items={items} parents={cats.filter((c) => !c.parentId).map((c) => [c.id, c.name])} />
    </div>
  );
}
