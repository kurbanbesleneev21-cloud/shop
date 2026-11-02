import { PageHeader } from "@/components/admin/sidebar";
import { AppearanceView } from "@/components/admin/appearance-view";
import { getSettings, hasDrafts } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Внешний вид" };

export default async function Appearance() {
  const [values, drafts, banners, cats, products] = await Promise.all([
    getSettings({ preview: true }),
    hasDrafts(),
    prisma.banner.findMany({ orderBy: [{ position: "asc" }, { sortOrder: "asc" }] }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.product.findMany({ where: { status: "PUBLISHED" }, orderBy: { salesCount: "desc" }, select: { id: true, title: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Настройка внешнего вида" subtitle="Логотип, цвета, шрифты, главная страница, баннеры, меню, футер и контакты" />
      <AppearanceView values={values} hasDrafts={drafts} banners={banners.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))} categories={cats.map((c) => [c.slug, c.name])} products={products.map((p) => [p.id, p.title])} />
    </div>
  );
}
