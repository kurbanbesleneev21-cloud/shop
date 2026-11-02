import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters } from "@/components/admin/list-filters";
import { SellersView } from "@/components/admin/sellers-view";
import { sellersFinance } from "@/lib/finance";
import { getGroup } from "@/lib/settings";

export const metadata = { title: "Продавцы" };

export default async function Sellers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.SellerWhereInput = {};
  if (sp.status) where.status = sp.status as never;
  if (sp.q) where.OR = [{ shopName: { contains: sp.q, mode: "insensitive" } }, { user: { email: { contains: sp.q, mode: "insensitive" } } }, { inn: { contains: sp.q } }];
  const sellers = await prisma.seller.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { user: { select: { email: true, name: true } } } });
  const [fin, com] = await Promise.all([sellersFinance(sellers.map((s) => s.id)), getGroup<{ defaultRate: number }>("commissions")]);
  const zero = { turnover: 0, commission: 0, delivered: 0, paid: 0, pending: 0, balance: 0, orders: 0, products: 0 };
  return (
    <div>
      <PageHeader title="Продавцы" subtitle="Заявки, модерация, комиссии и финансовые показатели" />
      <ListFilters placeholder="Магазин, email или ИНН" selects={[{ name: "status", label: "Все статусы", options: [["PENDING", "Заявки"], ["APPROVED", "Активные"], ["BLOCKED", "Заблокированные"], ["REJECTED", "Отклонённые"]] }]} />
      <SellersView
        defaultRate={Number(com.defaultRate)}
        rows={sellers.map((s) => ({ id: s.id, shopName: s.shopName, slug: s.slug, status: s.status, description: s.description, legalName: s.legalName, inn: s.inn, phone: s.phone, email: s.email, commissionRate: s.commissionRate, createdAt: s.createdAt.toISOString(), userEmail: s.user.email, userName: s.user.name, fin: fin[s.id] ?? zero }))}
      />
    </div>
  );
}
