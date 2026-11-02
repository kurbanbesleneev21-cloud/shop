import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { operations, sellersFinance } from "@/lib/finance";
import { SellerPayoutForm } from "@/components/shop/seller-payout";
import { ORDER_STATUS_LABELS, formatDate, formatPrice } from "@/lib/utils";

export default async function SellerFinance() {
  const user = (await getCurrentUser())!;
  const sellerId = user.seller!.id;
  const [fin, ops, payouts] = await Promise.all([sellersFinance([sellerId]), operations(50, sellerId), prisma.payout.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" } })]);
  const f = fin[sellerId];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Оборот", f?.turnover ?? 0], ["Комиссия маркетплейса", f?.commission ?? 0], ["Выплачено", f?.paid ?? 0], ["Доступно к выводу", f?.balance ?? 0]].map(([l, v], i) => (
          <div key={l as string} className={`rounded-card p-4 ${i === 3 ? "bg-brand text-white" : "bg-ink-50"}`}><div className={`text-xs ${i === 3 ? "text-white/80" : "text-ink-500"}`}>{l}</div><div className="mt-1 text-xl font-extrabold">{formatPrice(v as number)}</div></div>
        ))}
      </div>
      <p className="text-sm text-ink-500">Ставка комиссии: {user.seller!.commissionRate ?? "по умолчанию"}%. К выводу доступны средства по доставленным заказам за вычетом комиссии.</p>
      <SellerPayoutForm balance={Math.max(0, f?.balance ?? 0)} />
      <div className="rounded-card border border-ink-100">
        <h2 className="p-4 font-bold">Выплаты</h2>
        {payouts.length ? <ul className="divide-y divide-ink-100">{payouts.map((p) => <li key={p.id} className="flex justify-between px-4 py-2.5 text-sm"><span>{formatDate(p.createdAt)} · {p.status === "PAID" ? "выплачено" : p.status === "PENDING" ? "в обработке" : "отменено"}</span><b>{formatPrice(p.amount)}</b></li>)}</ul> : <p className="px-4 pb-4 text-sm text-ink-500">Выплат пока не было</p>}
      </div>
      <div className="overflow-hidden rounded-card border border-ink-100">
        <h2 className="p-4 font-bold">Операции</h2>
        <div className="overflow-x-auto"><table className="table-tm"><thead><tr><th>Дата</th><th>Операция</th><th>Статус</th><th className="text-right">Комиссия</th><th className="text-right">Сумма</th></tr></thead><tbody>
          {ops.map((o) => <tr key={o.type + o.id}><td className="whitespace-nowrap text-ink-500">{formatDate(o.date, true)}</td><td>{o.type} {o.ref}</td><td className="text-xs">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td><td className="text-right text-ink-500">{o.commission ? formatPrice(o.commission) : "—"}</td><td className="text-right font-semibold">{formatPrice(o.amount)}</td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}
