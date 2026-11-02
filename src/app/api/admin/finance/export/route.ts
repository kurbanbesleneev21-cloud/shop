import { route, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { operations, sellersFinance } from "@/lib/finance";
import { toCsv, toXlsx } from "@/lib/xlsx";
import { ORDER_STATUS_LABELS } from "@/lib/utils";
import { audit } from "@/lib/audit";

export const GET = route({ auth: "admin" }, async (req, { user }) => {
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const type = req.nextUrl.searchParams.get("type") || "operations";
  let rows: (string | number)[][];
  if (type === "sellers") {
    const sellers = await prisma.seller.findMany({ orderBy: { shopName: "asc" } });
    const fin = await sellersFinance(sellers.map((s) => s.id));
    rows = [["Продавец", "Статус", "Ставка комиссии, %", "Товаров", "Заказов", "Оборот, ₽", "Комиссия, ₽", "Доставлено, ₽", "Выплачено, ₽", "К выплате, ₽"]];
    for (const s of sellers) { const f = fin[s.id]; rows.push([s.shopName, s.status, s.commissionRate ?? "по умолчанию", f?.products ?? 0, f?.orders ?? 0, f?.turnover ?? 0, f?.commission ?? 0, f?.delivered ?? 0, f?.paid ?? 0, f?.balance ?? 0]); }
  } else if (type === "orders") {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
    rows = [["№", "Дата", "Покупатель", "Email", "Телефон", "Статус", "Оплата", "Статус оплаты", "Доставка", "Товары, ₽", "Скидка, ₽", "Доставка, ₽", "Итого, ₽", "Комиссия, ₽"]];
    for (const o of orders) rows.push([o.number, o.createdAt.toISOString().slice(0, 16).replace("T", " "), o.recipientName, o.email, o.phone, ORDER_STATUS_LABELS[o.status], o.paymentMethod, o.paymentStatus, o.deliveryMethod, o.subtotal, o.discount, o.deliveryPrice, o.total, o.commissionTotal]);
  } else if (type === "operations") {
    const ops = await operations(5000);
    rows = [["Дата", "Операция", "Ссылка", "Сумма, ₽", "Комиссия, ₽", "Статус", "Примечание"]];
    for (const o of ops) rows.push([o.date.toISOString().slice(0, 16).replace("T", " "), o.type, o.ref, o.amount, o.commission, ORDER_STATUS_LABELS[o.status] ?? o.status, o.note]);
  } else throw new ApiError(400, "Неизвестный тип отчёта");
  await audit(user, "finance.export", "finance", null, { type, format });
  const name = `techmarket-${type}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "xlsx") {
    return new Response(new Uint8Array(toXlsx(rows, type)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
  }
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
});
