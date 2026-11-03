import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters, Pager } from "@/components/admin/list-filters";
import { StatusBadge } from "@/components/shop/order-bits";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS, formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Заказы" };
const PER = 30;

import { expireUnpaidOrders } from "@/lib/payments";

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await expireUnpaidOrders().catch(() => 0);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.q) {
    const n = Number(sp.q.replace(/\D/g, ""));
    where.OR = [{ recipientName: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }, ...(n ? [{ number: n }] : [])];
  }
  if (sp.status) where.status = sp.status as never;
  if (sp.payment) where.paymentMethod = sp.payment;
  if (sp.delivery) where.deliveryMethod = sp.delivery;
  if (sp.seller) where.items = { some: { sellerId: sp.seller } };
  const [orders, total, sellers, byStatus] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } }, user: { select: { email: true } } } }),
    prisma.order.count({ where }),
    prisma.seller.findMany({ select: { id: true, shopName: true } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <div>
      <PageHeader title="Заказы" subtitle={byStatus.map((s) => `${ORDER_STATUS_LABELS[s.status]}: ${s._count}`).join(" · ")} />
      <ListFilters
        placeholder="№ заказа, имя, email или телефон"
        selects={[
          { name: "status", label: "Все статусы", options: Object.entries(ORDER_STATUS_LABELS) },
          { name: "payment", label: "Любая оплата", options: Object.entries(PAYMENT_LABELS) },
          { name: "delivery", label: "Любая доставка", options: Object.entries(DELIVERY_LABELS) },
          { name: "seller", label: "Все продавцы", options: sellers.map((s) => [s.id, s.shopName]) },
        ]}
      />
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="table-tm">
            <thead><tr><th>№</th><th>Дата</th><th>Покупатель</th><th>Товаров</th><th>Оплата</th><th>Статус</th><th className="text-right">Сумма</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-bold text-brand">{o.number}</Link></td>
                  <td className="whitespace-nowrap text-ink-500">{formatDate(o.createdAt, true)}</td>
                  <td><div className="font-medium">{o.recipientName}</div><div className="text-xs text-ink-500">{o.email}{!o.userId && " · гость"}</div></td>
                  <td>{o._count.items}</td>
                  <td className="whitespace-nowrap text-xs">{PAYMENT_LABELS[o.paymentMethod]}<br /><span className={o.paymentStatus === "paid" ? "font-semibold text-brand" : "text-ink-500"}>{o.paymentStatus === "paid" ? "оплачен" : o.paymentStatus === "refunded" ? "возврат средств" : "не оплачен"}</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right font-semibold">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && <div className="p-10 text-center text-ink-500">Заказы не найдены</div>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
