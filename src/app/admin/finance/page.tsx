import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { PeriodTabs } from "@/components/admin/period-tabs";
import { AreaChart } from "@/components/admin/charts";
import { periodRange, salesSeries, type Period } from "@/lib/stats";
import { operations, sellersFinance } from "@/lib/finance";
import { ORDER_STATUS_LABELS, formatDate, formatPrice } from "@/lib/utils";
import { PayoutActions } from "@/components/admin/payout-actions";

export const metadata = { title: "Финансы" };

export default async function Finance({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (["day", "week", "month", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const { from } = periodRange(period);
  const ok = { status: { notIn: ["CANCELLED", "RETURNED"] as ("CANCELLED" | "RETURNED")[] } };
  const [agg, aggAll, sellers, ops, series, refunds, pendingPayouts] = await Promise.all([
    prisma.order.aggregate({ where: { ...ok, createdAt: { gte: from } }, _sum: { total: true, commissionTotal: true, deliveryPrice: true, discount: true }, _count: true }),
    prisma.order.aggregate({ where: ok, _sum: { total: true, commissionTotal: true } }),
    prisma.seller.findMany({ select: { id: true, shopName: true } }),
    operations(60),
    salesSeries(period),
    prisma.order.aggregate({ where: { status: { in: ["CANCELLED", "RETURNED"] }, createdAt: { gte: from } }, _sum: { total: true }, _count: true }),
    prisma.payout.findMany({ where: { status: "PENDING" }, include: { seller: { select: { shopName: true } } } }),
  ]);
  const fin = await sellersFinance(sellers.map((s) => s.id));
  const sellerTurnover = Object.values(fin).reduce((s, f) => s + f.turnover, 0);
  const paidOut = Object.values(fin).reduce((s, f) => s + f.paid, 0);
  const owed = Object.values(fin).reduce((s, f) => s + Math.max(0, f.balance), 0);
  const income = (agg._sum.commissionTotal ?? 0) + (agg._sum.deliveryPrice ?? 0) - (agg._sum.discount ?? 0);
  const cards = [
    ["Выручка за период", agg._sum.total ?? 0, `всего ${formatPrice(aggAll._sum.total ?? 0)}`],
    ["Комиссии за период", agg._sum.commissionTotal ?? 0, `всего ${formatPrice(aggAll._sum.commissionTotal ?? 0)}`],
    ["Доход маркетплейса", income, "комиссии + доставка − промокоды"],
    ["Оборот продавцов", sellerTurnover, "за всё время"],
    ["Выплачено продавцам", paidOut, `ожидают выплаты ${formatPrice(owed)}`],
    ["Отмены и возвраты", refunds._sum.total ?? 0, `${refunds._count} заказов за период`],
  ] as const;
  const exp = (type: string, format: string) => `/api/admin/finance/export?type=${type}&format=${format}`;
  return (
    <div>
      <PageHeader title="Финансы" subtitle="Выручка, комиссии, выплаты продавцам и отчёты" actions={<PeriodTabs value={period} base="/admin/finance" />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([l, v, s], i) => (
          <div key={l} className={`rounded-card p-4 shadow-card ${i === 2 ? "bg-brand text-white" : "bg-white"}`}>
            <div className={`text-sm ${i === 2 ? "text-white/80" : "text-ink-500"}`}>{l}</div>
            <div className="mt-1 text-xl font-extrabold sm:text-2xl">{formatPrice(v)}</div>
            <div className={`text-xs ${i === 2 ? "text-white/70" : "text-ink-400"}`}>{s}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-card bg-white p-5 shadow-card"><h2 className="mb-3 font-bold">Динамика выручки</h2><AreaChart key={period} data={series} height={200} /></div>
      <div className="mt-5 rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-3 font-bold">Финансовые отчёты</h2>
        <div className="flex flex-wrap gap-2">
          {[["operations", "История операций"], ["orders", "Заказы"], ["sellers", "Продавцы и выплаты"]].map(([t, l]) => (
            <div key={t} className="flex items-center gap-1 rounded-xl bg-ink-50 p-1 pl-3 text-sm font-medium">
              {l}
              <a href={exp(t, "csv")} className="btn-outline btn-sm ml-2"><Download size={14} />CSV</a>
              <a href={exp(t, "xlsx")} className="btn-primary btn-sm"><Download size={14} />Excel</a>
            </div>
          ))}
        </div>
      </div>
      {pendingPayouts.length > 0 && (
        <div className="mt-5 rounded-card bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold">Выплаты в обработке</h2>
          <ul className="space-y-2">{pendingPayouts.map((p) => <li key={p.id} className="flex items-center gap-3 text-sm"><span className="flex-1">{p.seller.shopName} · {formatDate(p.createdAt)}</span><b>{formatPrice(p.amount)}</b><PayoutActions id={p.id} /></li>)}</ul>
        </div>
      )}
      <div className="mt-5 overflow-hidden rounded-card bg-white shadow-card">
        <h2 className="p-5 pb-3 font-bold">История операций</h2>
        <div className="overflow-x-auto">
          <table className="table-tm">
            <thead><tr><th>Дата</th><th>Операция</th><th>Ссылка</th><th>Статус</th><th className="text-right">Комиссия</th><th className="text-right">Сумма</th></tr></thead>
            <tbody>
              {ops.map((o) => (
                <tr key={o.type + o.id}>
                  <td className="whitespace-nowrap text-ink-500">{formatDate(o.date, true)}</td>
                  <td>{o.type}</td>
                  <td className="font-medium">{o.ref}</td>
                  <td className="text-xs">{ORDER_STATUS_LABELS[o.status] ?? (o.status === "PAID" ? "Выплачено" : o.status === "PENDING" ? "В обработке" : o.status)}</td>
                  <td className="text-right text-ink-500">{o.commission ? formatPrice(o.commission) : "—"}</td>
                  <td className={`whitespace-nowrap text-right font-semibold ${o.amount < 0 ? "" : "text-brand"}`}>{o.amount < 0 ? "−" : "+"}{formatPrice(Math.abs(o.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
