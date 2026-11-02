import Link from "next/link";
import { AlertTriangle, Coins, Package, ShoppingBag, Store, TrendingUp, Users, Clock, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { periodRange, salesSeries, type Period } from "@/lib/stats";
import { formatDate, formatPrice } from "@/lib/utils";
import { AreaChart, BarList } from "@/components/admin/charts";
import { PeriodTabs } from "@/components/admin/period-tabs";
import { PageHeader } from "@/components/admin/sidebar";
import { StatusBadge } from "@/components/shop/order-bits";

export const metadata = { title: "Дашборд" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (["day", "week", "month", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const { from } = periodRange(period);
  const ok = { status: { notIn: ["CANCELLED", "RETURNED"] as ("CANCELLED" | "RETURNED")[] } };
  const [rev, revAll, users, newUsers, sellers, products, activeProducts, pending, series, latest, top, lowStock] = await Promise.all([
    prisma.order.aggregate({ where: { ...ok, createdAt: { gte: from } }, _sum: { total: true, commissionTotal: true }, _count: true }),
    prisma.order.aggregate({ where: ok, _sum: { total: true, commissionTotal: true }, _count: true }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: from } } }),
    prisma.seller.count({ where: { status: "APPROVED" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "PUBLISHED", stock: { gt: 0 } } }),
    prisma.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "PAID"] } } }),
    salesSeries(period),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, total: true, status: true, createdAt: true, recipientName: true } }),
    prisma.orderItem.groupBy({ by: ["productId", "title"], where: { order: { ...ok, createdAt: { gte: from } } }, _sum: { qty: true, price: true }, orderBy: { _sum: { qty: "desc" } }, take: 7 }),
    prisma.product.findMany({ where: { status: "PUBLISHED", stock: { lte: 3 } }, take: 6, orderBy: { stock: "asc" }, select: { id: true, title: true, stock: true } }),
  ]);
  const avg = rev._count ? Math.round((rev._sum.total ?? 0) / rev._count) : 0;
  const cards = [
    { label: "Выручка за период", value: formatPrice(rev._sum.total ?? 0), sub: `всего ${formatPrice(revAll._sum.total ?? 0)}`, icon: TrendingUp, accent: true },
    { label: "Заказы за период", value: rev._count, sub: `всего ${revAll._count} · средний чек ${formatPrice(avg)}`, icon: ShoppingBag },
    { label: "Доход от комиссий", value: formatPrice(rev._sum.commissionTotal ?? 0), sub: `всего ${formatPrice(revAll._sum.commissionTotal ?? 0)}`, icon: Coins },
    { label: "Ожидают обработки", value: pending, sub: "новые и оплаченные заказы", icon: Clock },
    { label: "Пользователи", value: users, sub: `+${newUsers} за период`, icon: Users },
    { label: "Продавцы", value: sellers, sub: "одобренные", icon: Store },
    { label: "Товары", value: products, sub: "в каталоге", icon: Package },
    { label: "Активные товары", value: activeProducts, sub: "опубликованы и в наличии", icon: CheckCircle2 },
  ];
  return (
    <div>
      <PageHeader title="Дашборд" subtitle="Ключевые показатели маркетплейса" actions={<PeriodTabs value={period} base="/admin" />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className={`animate-fade-up rounded-card p-4 shadow-card ${c.accent ? "bg-brand text-white" : "bg-white"}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium sm:text-sm ${c.accent ? "text-white/80" : "text-ink-500"}`}>{c.label}</span>
              <c.icon size={18} className={c.accent ? "text-white/80" : "text-brand"} />
            </div>
            <div className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">{c.value}</div>
            <div className={`mt-0.5 text-xs ${c.accent ? "text-white/70" : "text-ink-400"}`}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">График продаж</h2><span className="text-sm text-ink-500">{series.reduce((s, x) => s + x.orders, 0)} заказов</span></div>
          <AreaChart key={period} data={series} />
        </div>
        <div className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 className="mb-4 font-bold">Популярные товары</h2>
          {top.length ? <BarList items={top.map((t) => ({ label: t.title, value: t._sum.qty ?? 0, sub: "шт." }))} /> : <p className="text-sm text-ink-500">Нет продаж за период</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex items-center justify-between p-4 sm:p-5"><h2 className="font-bold">Последние заказы</h2><Link href="/admin/orders" className="text-sm font-semibold text-brand">Все заказы</Link></div>
          <div className="overflow-x-auto">
            <table className="table-tm">
              <thead><tr><th>№</th><th>Покупатель</th><th>Дата</th><th>Статус</th><th className="text-right">Сумма</th></tr></thead>
              <tbody>
                {latest.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand">{o.number}</Link></td>
                    <td>{o.recipientName}</td>
                    <td className="whitespace-nowrap text-ink-500">{formatDate(o.createdAt, true)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right font-semibold">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><AlertTriangle size={18} className="text-brand" />Заканчиваются</h2>
          {lowStock.length ? (
            <ul className="space-y-2 text-sm">
              {lowStock.map((p) => <li key={p.id} className="flex justify-between gap-2"><Link href={`/admin/products/${p.id}`} className="line-clamp-1 hover:text-brand">{p.title}</Link><span className="shrink-0 font-bold">{p.stock} шт.</span></li>)}
            </ul>
          ) : <p className="text-sm text-ink-500">Все товары в достатке</p>}
        </div>
      </div>
    </div>
  );
}
