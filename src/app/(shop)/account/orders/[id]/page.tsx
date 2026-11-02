import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS, PAYMENT_LABELS, formatDate, formatPrice } from "@/lib/utils";
import { StatusBadge, OrderProgress, Timeline } from "@/components/shop/order-bits";
import { ProductImage } from "@/components/shop/product-image";
import { OrderActions } from "@/components/shop/order-actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { slug: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } } }, events: { orderBy: { createdAt: "asc" } } } });
  if (!o || o.userId !== user.id) notFound();
  const reviewed = await prisma.review.findMany({ where: { userId: user.id, productId: { in: o.items.map((i) => i.productId).filter((x): x is string => !!x) } }, select: { productId: true } });
  return (
    <div className="space-y-5">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand"><ChevronLeft size={16} />Все заказы</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-extrabold">Заказ №{o.number}</h2>
        <StatusBadge status={o.status} />
        <span className="text-sm text-ink-500">от {formatDate(o.createdAt, true)}</span>
      </div>
      <OrderProgress status={o.status} />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <ul className="divide-y divide-ink-100 rounded-card border border-ink-100">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-3 p-3 sm:p-4">
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-50"><ProductImage src={i.image ?? i.product?.images[0]?.url} alt="" sizes="80px" /></span>
                <div className="min-w-0 flex-1">
                  {i.product ? <Link href={`/product/${i.product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand">{i.title}</Link> : <div className="text-sm font-medium">{i.title}</div>}
                  <div className="mt-1 text-sm text-ink-500">{i.qty} × {formatPrice(i.price)}</div>
                  {o.status === "DELIVERED" && i.product && !reviewed.some((r) => r.productId === i.productId) && (
                    <Link href={`/product/${i.product.slug}#reviews`} className="mt-1 inline-block text-sm font-semibold text-brand">Оставить отзыв</Link>
                  )}
                </div>
                <div className="font-bold">{formatPrice(i.price * i.qty)}</div>
              </li>
            ))}
          </ul>
          <div className="rounded-card border border-ink-100 p-4 sm:p-5">
            <h3 className="mb-3 font-bold">История заказа</h3>
            <Timeline events={o.events} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2 rounded-card bg-ink-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Товары</span><span>{formatPrice(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between"><span className="text-ink-500">Скидка {o.promoCode}</span><span className="text-brand">−{formatPrice(o.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-ink-500">Доставка</span><span>{o.deliveryPrice ? formatPrice(o.deliveryPrice) : "Бесплатно"}</span></div>
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-bold"><span>Итого</span><span>{formatPrice(o.total)}</span></div>
          </div>
          <div className="space-y-1.5 rounded-card border border-ink-100 p-4 text-sm">
            <div><span className="text-ink-500">Получатель:</span> {o.recipientName}, {o.phone}</div>
            <div><span className="text-ink-500">Доставка:</span> {DELIVERY_LABELS[o.deliveryMethod]}{o.address ? `, ${o.city}, ${o.address}` : ""}</div>
            <div><span className="text-ink-500">Оплата:</span> {PAYMENT_LABELS[o.paymentMethod]} · {o.paymentStatus === "paid" ? "оплачено" : "ожидает оплаты"}</div>
            {o.comment && <div><span className="text-ink-500">Комментарий:</span> {o.comment}</div>}
          </div>
          <OrderActions id={o.id} status={o.status} />
        </div>
      </div>
    </div>
  );
}
