import Link from "next/link";
import { Package } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, plural } from "@/lib/utils";
import { StatusBadge, OrderProgress } from "@/components/shop/order-bits";
import { ProductImage } from "@/components/shop/product-image";

export default async function OrdersPage() {
  const user = (await getCurrentUser())!;
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: { select: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } } } }, take: 100 });
  if (!orders.length) {
    return (
      <div className="grid place-items-center rounded-card bg-ink-50 py-16 text-center">
        <Package size={40} className="text-brand" />
        <h2 className="mt-3 text-xl font-bold">Заказов пока нет</h2>
        <Link href="/catalog" className="btn-primary mt-5">Начать покупки</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const count = o.items.reduce((s, i) => s + i.qty, 0);
        return (
          <Link key={o.id} href={`/account/orders/${o.id}`} className="block rounded-card border border-ink-100 p-4 transition hover:border-brand hover:shadow-card sm:p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="font-bold">Заказ №{o.number}</div>
              <div className="text-sm text-ink-500">от {formatDate(o.createdAt)}</div>
              <StatusBadge status={o.status} />
              <div className="ml-auto text-lg font-extrabold">{formatPrice(o.total)}</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {o.items.slice(0, 5).map((i) => (
                <span key={i.id} className="relative h-14 w-14 overflow-hidden rounded-xl bg-ink-50"><ProductImage src={i.image ?? i.product?.images[0]?.url} alt="" sizes="56px" /></span>
              ))}
              <span className="ml-2 text-sm text-ink-500">{count} {plural(count, ["товар", "товара", "товаров"])}</span>
            </div>
            <div className="mt-4"><OrderProgress status={o.status} /></div>
          </Link>
        );
      })}
    </div>
  );
}
