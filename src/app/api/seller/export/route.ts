import { route, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toCsv, toXlsx } from "@/lib/xlsx";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/lib/utils";

export const GET = route({ auth: "seller" }, async (req, { user }) => {
  const sellerId = user!.seller?.id;
  if (!sellerId) throw new ApiError(403, "Нет магазина");
  const type = req.nextUrl.searchParams.get("type") === "orders" ? "orders" : "products";
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  let rows: (string | number)[][];
  if (type === "products") {
    const ps = await prisma.product.findMany({ where: { sellerId }, orderBy: { title: "asc" }, include: { category: { select: { name: true } } } });
    rows = [["Артикул", "Название", "Категория", "Цена, ₽", "Старая цена, ₽", "Остаток", "Статус", "Продано", "Просмотры", "Рейтинг"]];
    for (const p of ps) rows.push([p.sku, p.title, p.category.name, p.price, p.oldPrice ?? "", p.stock, p.status, p.salesCount, p.viewsCount, p.rating]);
  } else {
    const items = await prisma.orderItem.findMany({ where: { sellerId }, orderBy: { order: { createdAt: "desc" } }, include: { order: true }, take: 10000 });
    rows = [["Заказ", "Дата", "Статус", "Оплата", "Товар", "Артикул", "Кол-во", "Цена, ₽", "Сумма, ₽", "Комиссия, ₽", "К получению, ₽"]];
    for (const i of items) rows.push([i.order.number, i.order.createdAt.toISOString().slice(0, 16).replace("T", " "), ORDER_STATUS_LABELS[i.order.status], PAYMENT_LABELS[i.order.paymentMethod] ?? i.order.paymentMethod, i.title, i.sku ?? "", i.qty, i.price, i.price * i.qty, i.commission, i.price * i.qty - i.commission]);
  }
  const name = `seller-${type}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "xlsx") return new Response(new Uint8Array(toXlsx(rows, type)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
});
