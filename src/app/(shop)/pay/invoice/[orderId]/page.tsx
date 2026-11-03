import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getGroup } from "@/lib/settings";
import { formatDate, formatPrice } from "@/lib/utils";
import { PrintButton } from "@/components/shop/print-button";

export const metadata = { title: "Счёт на оплату", robots: { index: false } };

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [o, user, req] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }),
    getCurrentUser(),
    getGroup<Record<string, string>>("payments"),
  ]);
  // Access: the buyer, an admin, or the holder of a guest order link
  if (!o || o.paymentMethod !== "invoice" || (o.userId && o.userId !== user?.id && user?.role !== "ADMIN")) notFound();
  return (
    <div className="container-tm max-w-3xl py-8 print:max-w-none print:p-0">
      <div className="mb-4 flex justify-end gap-2 print:hidden"><PrintButton /></div>
      <div className="rounded-card border border-ink-200 p-6 text-sm sm:p-10 print:border-0">
        <table className="w-full border border-ink-300 text-xs">
          <tbody>
            <tr><td className="border border-ink-300 p-2" colSpan={2}>{req.companyBank}<br /><span className="text-ink-500">Банк получателя</span></td><td className="border border-ink-300 p-2">БИК<br />Сч. №</td><td className="border border-ink-300 p-2">{req.companyBik}<br />{req.companyCorrAccount}</td></tr>
            <tr><td className="border border-ink-300 p-2">ИНН/КПП {req.companyInn}</td><td className="border border-ink-300 p-2">{req.companyName}<br /><span className="text-ink-500">Получатель</span></td><td className="border border-ink-300 p-2">Сч. №</td><td className="border border-ink-300 p-2">{req.companyAccount}</td></tr>
          </tbody>
        </table>
        <h1 className="mt-6 text-xl font-extrabold">Счёт на оплату № TM-{o.number} от {formatDate(o.createdAt)}</h1>
        <div className="mt-4 space-y-1">
          <div><span className="text-ink-500">Поставщик:</span> {req.companyName}, ИНН/КПП {req.companyInn}</div>
          <div><span className="text-ink-500">Покупатель:</span> {o.companyName}, ИНН {o.companyInn}</div>
        </div>
        <table className="mt-5 w-full border-collapse text-xs">
          <thead><tr className="bg-ink-50"><th className="border border-ink-300 p-2">№</th><th className="border border-ink-300 p-2 text-left">Товар</th><th className="border border-ink-300 p-2">Кол-во</th><th className="border border-ink-300 p-2">Цена</th><th className="border border-ink-300 p-2">Сумма</th></tr></thead>
          <tbody>
            {o.items.map((i, k) => (
              <tr key={i.id}><td className="border border-ink-300 p-2 text-center">{k + 1}</td><td className="border border-ink-300 p-2">{i.title}</td><td className="border border-ink-300 p-2 text-center">{i.qty} шт.</td><td className="border border-ink-300 p-2 text-right">{formatPrice(i.price)}</td><td className="border border-ink-300 p-2 text-right">{formatPrice(i.price * i.qty)}</td></tr>
            ))}
            {o.deliveryPrice > 0 && <tr><td className="border border-ink-300 p-2 text-center">{o.items.length + 1}</td><td className="border border-ink-300 p-2">Доставка</td><td className="border border-ink-300 p-2 text-center">1</td><td className="border border-ink-300 p-2 text-right">{formatPrice(o.deliveryPrice)}</td><td className="border border-ink-300 p-2 text-right">{formatPrice(o.deliveryPrice)}</td></tr>}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 text-right">
          {o.discount > 0 && <div>Скидка: −{formatPrice(o.discount)}</div>}
          <div className="text-base font-bold">Итого к оплате: {formatPrice(o.total)}</div>
          <div className="text-ink-500">НДС не облагается</div>
        </div>
        <p className="mt-6 text-xs text-ink-500">В назначении платежа укажите: «Оплата по счёту № TM-{o.number}». Счёт действителен 5 банковских дней. Отгрузка после поступления денег на расчётный счёт.</p>
      </div>
    </div>
  );
}
