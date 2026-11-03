import Link from "next/link";
import { AlertTriangle, ShoppingBag, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { periodRange, salesSeries, type Period } from "@/lib/stats";
import { sellersFinance } from "@/lib/finance";
import { AreaChart, BarList } from "@/components/admin/charts";
import { PeriodTabs } from "@/components/admin/period-tabs";
import { formatPrice } from "@/lib/utils";

export default async function SellerHome({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (["day", "week", "month", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const user = (await getCurrentUser())!;
  const sellerId = user.seller!.id;
  const { from } = periodRange(period);
  const [series, fin, products, published, top, views, todo, lowStock, periodItems, drafts, shop] = await Promise.all([
    salesSeries(period, sellerId),
    sellersFinance([sellerId]),
    prisma.product.count({ where: { sellerId } }),
    prisma.product.count({ where: { sellerId, status: "PUBLISHED" } }),
    prisma.product.findMany({ where: { sellerId }, orderBy: { salesCount: "desc" }, take: 6, select: { title: true, salesCount: true } }),
    prisma.product.aggregate({ where: { sellerId }, _sum: { viewsCount: true } }),
    prisma.order.count({ where: { items: { some: { sellerId } }, status: { in: ["NEW", "CONFIRMED", "PAID", "RETURN_REQUESTED"] } } }),
    prisma.product.findMany({ where: { sellerId, status: "PUBLISHED", stock: { lte: 3 } }, orderBy: { stock: "asc" }, take: 6, select: { id: true, title: true, stock: true } }),
    prisma.orderItem.findMany({ where: { sellerId, order: { createdAt: { gte: from }, status: { notIn: ["CANCELLED", "RETURNED"] } } }, select: { price: true, qty: true, orderId: true, commission: true } }),
    prisma.product.count({ where: { sellerId, status: "DRAFT" } }),
    prisma.seller.findUnique({ where: { id: sellerId }, select: { inn: true, bankAccount: true, rating: true } }),
  ]);
  const f = fin[sellerId];
  const revenue = periodItems.reduce((s, i) => s + i.price * i.qty, 0);
  const orders = new Set(periodItems.map((i) => i.orderId)).size;
  const avg = orders ? Math.round(revenue / orders) : 0;
  const conv = views._sum.viewsCount ? ((f?.orders ?? 0) / views._sum.viewsCount) * 100 : 0;
  const cards: [string, string | number][] = [
    ["Выручка за период", formatPrice(revenue)],
    ["Заказы за период", orders],
    ["Средний чек", formatPrice(avg)],
    ["К выплате", formatPrice(f?.balance ?? 0)],
    ["Товары в продаже", `${published} / ${products}`],
    ["Конверсия просмотров", `${conv.toFixed(2)}%`],
  ];
  return (
    <div className="space-y-5">
      {(!shop?.inn || !shop.bankAccount) && (
        <Link href="/seller/settings" className="flex items-center gap-3 rounded-card border-2 border-brand-200 bg-brand-50 p-4 text-sm"><AlertTriangle className="shrink-0 text-brand" />Заполните ИНН и банковские реквизиты в настройках магазина — без них выплаты недоступны.</Link>
      )}
      {(todo > 0 || drafts > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {todo > 0 && <Link href="/seller/orders?tab=todo" className="flex items-center gap-3 rounded-card bg-ink p-4 text-white"><ShoppingBag /><span><b>{todo}</b> заказов требуют действий</span></Link>}
          {drafts > 0 && <Link href="/seller/products" className="flex items-center gap-3 rounded-card bg-ink-50 p-4"><Star className="text-brand" /><span><b>{drafts}</b> товаров ждут модерации или публикации</span></Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([l, v], i) => <div key={l} className={`rounded-card p-4 ${i === 0 ? "bg-brand text-white" : "bg-ink-50"}`}><div className={`text-xs ${i === 0 ? "text-white/80" : "text-ink-500"}`}>{l}</div><div className="mt-1 text-lg font-extrabold">{v}</div></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-card border border-ink-100 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Продажи</h2><PeriodTabs value={period} base="/seller" /></div>
          <AreaChart key={period} data={series} height={200} />
        </div>
        <div className="space-y-5">
          <div className="rounded-card border border-ink-100 p-4 sm:p-5"><h2 className="mb-3 font-bold">Лидеры продаж</h2><BarList items={top.map((t) => ({ label: t.title, value: t.salesCount, sub: "шт." }))} /></div>
          <div className="rounded-card border border-ink-100 p-4 sm:p-5">
            <h2 className="mb-2 font-bold">Заканчиваются</h2>
            {lowStock.length ? <ul className="space-y-1.5 text-sm">{lowStock.map((p) => <li key={p.id} className="flex justify-between gap-2"><Link href={`/seller/products/${p.id}`} className="line-clamp-1 hover:text-brand">{p.title}</Link><b>{p.stock} шт.</b></li>)}</ul> : <p className="text-sm text-ink-500">Запасов достаточно</p>}
          </div>
          <div className="rounded-card bg-ink-50 p-4 text-sm">Рейтинг магазина: <b>★ {shop?.rating.toFixed(1)}</b></div>
        </div>
      </div>
    </div>
  );
}
