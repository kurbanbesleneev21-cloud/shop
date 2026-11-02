import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shop/order-bits";
import { SellerOrderActions } from "@/components/shop/seller-order-actions";
import { DELIVERY_LABELS, formatDate, formatPrice } from "@/lib/utils";

export default async function SellerOrders() {
  const sellerId = (await getCurrentUser())!.seller!.id;
  const orders = await prisma.order.findMany({ where: { items: { some: { sellerId } } }, orderBy: { createdAt: "desc" }, take: 100, include: { items: true } });
  if (!orders.length) return <div className="rounded-card bg-ink-50 p-10 text-center text-ink-500">Заказов пока нет</div>;
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const mine = o.items.filter((i) => i.sellerId === sellerId);
        const onlyMine = mine.length === o.items.length;
        return (
          <div key={o.id} className="rounded-card border border-ink-100 p-4">
            <div className="flex flex-wrap items-center gap-3"><b>Заказ №{o.number}</b><span className="text-sm text-ink-500">{formatDate(o.createdAt, true)}</span><StatusBadge status={o.status} /><span className="ml-auto font-bold">{formatPrice(mine.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
            <ul className="mt-2 space-y-1 text-sm">{mine.map((i) => <li key={i.id} className="flex justify-between gap-3"><span>{i.title} × {i.qty}</span><span className="text-ink-500">комиссия {formatPrice(i.commission)}</span></li>)}</ul>
            <div className="mt-2 text-xs text-ink-500">{DELIVERY_LABELS[o.deliveryMethod]} · {o.recipientName}, {o.city ?? ""}</div>
            {onlyMine && <SellerOrderActions id={o.id} status={o.status} />}
          </div>
        );
      })}
    </div>
  );
}
