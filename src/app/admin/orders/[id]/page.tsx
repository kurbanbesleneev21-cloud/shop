import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS, PAYMENT_LABELS, formatDate, formatPrice } from "@/lib/utils";
import { StatusBadge, Timeline } from "@/components/shop/order-bits";
import { OrderAdminActions } from "@/components/admin/order-admin-actions";
import { STATUS_FLOW } from "@/lib/orders";

export const metadata = { title: "Заказ" };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { seller: { select: { id: true, shopName: true } }, product: { select: { id: true } } } }, events: { orderBy: { createdAt: "asc" } }, user: { select: { id: true, name: true, email: true, createdAt: true, _count: { select: { orders: true } } } } } });
  if (!o) notFound();
  return (
    <div>
      <Link href="/admin/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand"><ChevronLeft size={16} />Все заказы</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold">Заказ №{o.number}</h1><StatusBadge status={o.status} /><span className="text-sm text-ink-500">{formatDate(o.createdAt, true)}</span></div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-card bg-white shadow-card">
            <table className="table-tm">
              <thead><tr><th>Товар</th><th>Продавец</th><th className="text-right">Цена × кол-во</th><th className="text-right">Комиссия</th><th className="text-right">Сумма</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product ? <Link href={`/admin/products/${i.product.id}`} className="font-medium hover:text-brand">{i.title}</Link> : i.title}<div className="text-xs text-ink-500">{i.sku}</div></td>
                    <td className="text-sm">{i.seller ? <Link href={`/admin/sellers?q=${encodeURIComponent(i.seller.shopName)}`} className="hover:text-brand">{i.seller.shopName}</Link> : "Маркетплейс"}</td>
                    <td className="whitespace-nowrap text-right">{formatPrice(i.price)} × {i.qty}</td>
                    <td className="whitespace-nowrap text-right text-ink-500">{i.commissionRate}% · {formatPrice(i.commission)}</td>
                    <td className="whitespace-nowrap text-right font-semibold">{formatPrice(i.price * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-ink-100 p-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Товары</span><span>{formatPrice(o.subtotal)}</span></div>
              {o.discount > 0 && <div className="flex justify-between"><span className="text-ink-500">Промокод {o.promoCode}</span><span>−{formatPrice(o.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-500">Доставка</span><span>{formatPrice(o.deliveryPrice)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Итого</span><span>{formatPrice(o.total)}</span></div>
              <div className="flex justify-between text-ink-500"><span>Комиссия маркетплейса</span><span>{formatPrice(o.commissionTotal)}</span></div>
            </div>
          </div>
          <div className="rounded-card bg-white p-5 shadow-card"><h2 className="mb-4 font-bold">История изменений</h2><Timeline events={o.events} /></div>
        </div>
        <div className="space-y-5">
          <OrderAdminActions id={o.id} status={o.status} next={STATUS_FLOW[o.status] ?? []} paymentStatus={o.paymentStatus} />
          <div className="space-y-2 rounded-card bg-white p-5 text-sm shadow-card">
            <h2 className="mb-2 font-bold">Покупатель</h2>
            <div>{o.recipientName}</div>
            <div><a href={`tel:${o.phone}`} className="link">{o.phone}</a> · <a href={`mailto:${o.email}`} className="link">{o.email}</a></div>
            {o.user ? <Link href={`/admin/users?q=${encodeURIComponent(o.user.email)}`} className="link block">Профиль · {o.user._count.orders} заказов</Link> : <div className="text-ink-500">Гостевой заказ</div>}
            <h2 className="mb-1 mt-4 font-bold">Доставка и оплата</h2>
            <div>{DELIVERY_LABELS[o.deliveryMethod]}{o.address ? `: ${o.city}, ${o.address}` : ""}</div>
            <div>{PAYMENT_LABELS[o.paymentMethod]} · {o.paymentStatus === "paid" ? "оплачен" : o.paymentStatus}</div>
            {o.comment && <div className="rounded-lg bg-ink-50 p-2">💬 {o.comment}</div>}
            {o.cancelReason && <div className="rounded-lg bg-ink-50 p-2">Причина: {o.cancelReason}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
