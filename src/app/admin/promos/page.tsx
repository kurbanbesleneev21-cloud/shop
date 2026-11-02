import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { PromosManager, BannersManager } from "@/components/admin/managers";

export const metadata = { title: "Промокоды и акции" };

export default async function Promos() {
  const [promos, products, cats, banners] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.banner.findMany({ where: { position: "PROMO" }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="space-y-10">
      <div>
        <PageHeader title="Промокоды" subtitle="Размер скидки, срок действия, лимиты, минимальная сумма и выбор товаров" />
        <PromosManager
          items={promos.map((p) => ({ ...p, startsAt: p.startsAt?.toISOString() ?? "", endsAt: p.endsAt?.toISOString() ?? "", createdAt: p.createdAt.toISOString(), maxUses: p.maxUses ?? "" }))}
          products={products.map((p) => [p.id, p.title])}
          categories={cats.map((c) => [c.id, c.name])}
        />
      </div>
      <div>
        <PageHeader title="Баннеры акций" subtitle="Блок «Специальные предложения» на главной" />
        <BannersManager items={banners.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))} />
      </div>
    </div>
  );
}
