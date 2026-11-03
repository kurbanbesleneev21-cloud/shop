import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shop/order-bits";
import { DELIVERY_LABELS, PAYMENT_LABELS, cn, formatDate, formatPrice } from "@/lib/utils";

const TABS = [
  ["all", "Все"],
  ["todo", "Требуют действий"],
  ["shipping", "В доставке"],
  ["done", "Доставлены"],
  ["returns", "Возвраты"],
  ["cancelled", "Отменены"],
] as const;

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "all";
  const sellerId = (await getCurrentUser())!.seller!.id;
  const where: Prisma.OrderWhereInput = { items: { some: { sellerId } } };
  if (tab === "todo") where.status = { in: ["NEW", "CONFIRMED", "PAID"] };
  if (tab === "shipping") where.status = "SHIPPED";
  if (tab === "done") where.status = "DELIVERED";
  if (tab === "returns") where.status = { in: ["RETURN_REQUESTED", "RETURNED"] };
  if (tab === "cancelled") where.status = "CANCELLED";
  const n = Number(sp.q?.replace(/\D/g, ""));
  if (n) where.number = n;
  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { items: true } });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 scrollbar-none">
          {TABS.map(([k, l]) => <Link key={k} href={`/seller/orders?tab=${k}`} className={cn("chip h-8 shrink-0 text-xs", tab === k && "chip-active")}>{l}</Link>)}
        </div>
        <form className="flex gap-2"><input name="q" defaultValue={sp.q} className="input h-9 w-36 text-sm" placeholder="№ заказа" /><input type="hidden" name="tab" value={tab} /></form>
        <a href="/api/seller/export?type=orders&format=xlsx" className="btn-outline btn-sm"><Download size={14} />Excel</a>
      </div>
      {!orders.length ? (
        <div className="rounded-card bg-ink-50 p-10 text-center text-ink-500">Заказов нет</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const mine = o.items.filter((i) => i.sellerId === sellerId);
            const sum = mine.reduce((s, i) => s + i.price * i.qty, 0);
            const commission = mine.reduce((s, i) => s + i.commission, 0);
            return (
              <Link key={o.id} href={`/seller/orders/${o.id}`} className="block rounded-card border border-ink-100 p-4 transition hover:border-brand hover:shadow-card">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <b>№{o.number}</b>
                  <span className="text-sm text-ink-500">{formatDate(o.createdAt, true)}</span>
                  <StatusBadge status={o.status} />
                  {o.paymentStatus === "paid" ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand">оплачен</span> : <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs">{PAYMENT_LABELS[o.paymentMethod]}</span>}
                  <span className="ml-auto text-right"><b>{formatPrice(sum)}</b><span className="block text-xs text-ink-500">к получению {formatPrice(sum - commission)}</span></span>
                </div>
                <div className="mt-1 line-clamp-1 text-sm text-ink-600">{mine.map((i) => `${i.title} × ${i.qty}`).join(", ")}</div>
                <div className="text-xs text-ink-500">{DELIVERY_LABELS[o.deliveryMethod]}{o.city ? ` · ${o.city}` : ""}{mine.length !== o.items.length ? " · смешанный заказ (статус меняет маркетплейс)" : ""}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
