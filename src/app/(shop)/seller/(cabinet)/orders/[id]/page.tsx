import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatusBadge, Timeline } from "@/components/shop/order-bits";
import { SellerOrderActions } from "@/components/shop/seller-order-actions";
import { ProductImage } from "@/components/shop/product-image";
import { DELIVERY_LABELS, PAYMENT_LABELS, formatDate, formatPrice } from "@/lib/utils";

export default async function SellerOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sellerId = (await getCurrentUser())!.seller!.id;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { slug: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } } }, events: { orderBy: { createdAt: "asc" } } } });
  if (!o || !o.items.some((i) => i.sellerId === sellerId)) notFound();
  const mine = o.items.filter((i) => i.sellerId === sellerId);
  const onlyMine = mine.length === o.items.length;
  const sum = mine.reduce((s, i) => s + i.price * i.qty, 0);
  const commission = mine.reduce((s, i) => s + i.commission, 0);
  return (
    <div>
      <Link href="/seller/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand"><ChevronLeft size={16} />Все заказы</Link>
      <div className="mb-4 flex flex-wrap items-center gap-3"><h2 className="text-xl font-extrabold">Заказ №{o.number}</h2><StatusBadge status={o.status} /><span className="text-sm text-ink-500">{formatDate(o.createdAt, true)}</span></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <ul className="divide-y divide-ink-100 rounded-card border border-ink-100">
            {mine.map((i) => (
              <li key={i.id} className="flex gap-3 p-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-50"><ProductImage src={i.image ?? i.product?.images[0]?.url} alt="" sizes="64px" /></span>
                <div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-medium">{i.title}</div><div className="text-xs text-ink-500">{i.sku} · {i.qty} × {formatPrice(i.price)} · комиссия {i.commissionRate}%</div></div>
                <b className="text-sm">{formatPrice(i.price * i.qty)}</b>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-ink-50 p-3"><div className="text-xs text-ink-500">Сумма</div><b>{formatPrice(sum)}</b></div>
            <div className="rounded-xl bg-ink-50 p-3"><div className="text-xs text-ink-500">Комиссия</div><b>{formatPrice(commission)}</b></div>
            <div className="rounded-xl bg-brand-50 p-3"><div className="text-xs text-ink-500">К получению</div><b className="text-brand">{formatPrice(sum - commission)}</b></div>
          </div>
          <div className="rounded-card border border-ink-100 p-4"><h3 className="mb-3 font-bold">История</h3><Timeline events={o.events} /></div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5 rounded-card border border-ink-100 p-4 text-sm">
            <h3 className="mb-1 font-bold">Доставка</h3>
            <div>{DELIVERY_LABELS[o.deliveryMethod]}</div>
            <div>{o.recipientName}, {o.phone}</div>
            {o.address && <div>{o.city}, {o.address}</div>}
            {o.trackingNumber && <div>Трек-номер: <b>{o.trackingNumber}</b></div>}
            {o.comment && <div className="rounded-lg bg-ink-50 p-2">💬 {o.comment}</div>}
            <h3 className="mb-1 mt-3 font-bold">Оплата</h3>
            <div>{PAYMENT_LABELS[o.paymentMethod]} · {o.paymentStatus === "paid" ? "оплачен" : o.paymentStatus === "refunded" ? "возвращён" : "не оплачен"}</div>
          </div>
          {onlyMine ? <SellerOrderActions id={o.id} status={o.status} needsTracking={o.deliveryMethod !== "pickup"} paid={o.paymentStatus === "paid"} /> : <p className="rounded-card bg-ink-50 p-4 text-sm text-ink-600">В заказе есть товары других продавцов — статусом управляет маркетплейс. Подготовьте свои товары к отгрузке.</p>}
        </div>
      </div>
    </div>
  );
}
