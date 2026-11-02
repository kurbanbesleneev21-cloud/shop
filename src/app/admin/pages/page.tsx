import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { PagesManager } from "@/components/admin/managers";

export const metadata = { title: "Страницы" };

export default async function Pages() {
  const pages = await prisma.page.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader title="Страницы сайта" subtitle="О компании, доставка, оплата, возврат, политика и любые новые страницы" />
      <PagesManager items={pages.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))} />
    </div>
  );
}
