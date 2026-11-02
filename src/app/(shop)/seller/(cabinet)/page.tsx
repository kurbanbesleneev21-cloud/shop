import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { salesSeries, type Period } from "@/lib/stats";
import { sellersFinance } from "@/lib/finance";
import { AreaChart, BarList } from "@/components/admin/charts";
import { PeriodTabs } from "@/components/admin/period-tabs";
import { formatPrice } from "@/lib/utils";

export default async function SellerHome({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (["day", "week", "month", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const sellerId = (await getCurrentUser())!.seller!.id;
  const [series, fin, products, published, top, views] = await Promise.all([
    salesSeries(period, sellerId),
    sellersFinance([sellerId]),
    prisma.product.count({ where: { sellerId } }),
    prisma.product.count({ where: { sellerId, status: "PUBLISHED" } }),
    prisma.product.findMany({ where: { sellerId }, orderBy: { salesCount: "desc" }, take: 6, select: { title: true, salesCount: true } }),
    prisma.product.aggregate({ where: { sellerId }, _sum: { viewsCount: true } }),
  ]);
  const f = fin[sellerId];
  const cards = [["Оборот", formatPrice(f?.turnover ?? 0)], ["Заказов", f?.orders ?? 0], ["К выплате", formatPrice(f?.balance ?? 0)], ["Товаров", `${published} / ${products}`], ["Просмотров", views._sum.viewsCount ?? 0], ["Комиссия", formatPrice(f?.commission ?? 0)]];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([l, v], i) => <div key={l as string} className={`rounded-card p-4 ${i === 0 ? "bg-brand text-white" : "bg-ink-50"}`}><div className={`text-xs ${i === 0 ? "text-white/80" : "text-ink-500"}`}>{l}</div><div className="mt-1 text-lg font-extrabold">{v}</div></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-card border border-ink-100 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Продажи</h2><PeriodTabs value={period} base="/seller" /></div>
          <AreaChart key={period} data={series} height={200} />
        </div>
        <div className="rounded-card border border-ink-100 p-4 sm:p-5"><h2 className="mb-3 font-bold">Лидеры продаж</h2><BarList items={top.map((t) => ({ label: t.title, value: t.salesCount, sub: "шт." }))} /></div>
      </div>
    </div>
  );
}
