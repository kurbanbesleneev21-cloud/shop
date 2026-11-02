import "server-only";
import { prisma } from "./prisma";

export type Period = "day" | "week" | "month" | "year";

export function periodRange(p: Period) {
  const now = new Date();
  const from = new Date(now);
  if (p === "day") from.setHours(now.getHours() - 23, 0, 0, 0);
  if (p === "week") { from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0); }
  if (p === "month") { from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0); }
  if (p === "year") { from.setMonth(now.getMonth() - 11, 1); from.setHours(0, 0, 0, 0); }
  const unit = p === "day" ? "hour" : p === "year" ? "month" : "day";
  return { from, to: now, unit } as const;
}

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export async function salesSeries(p: Period, sellerId?: string) {
  const { from, unit } = periodRange(p);
  const rows = sellerId
    ? await prisma.$queryRawUnsafe<{ bucket: Date; revenue: number; orders: number }[]>(
        `SELECT date_trunc('${unit}', o."createdAt") AS bucket, COALESCE(SUM(oi.price * oi.qty),0)::float AS revenue, COUNT(DISTINCT o.id)::int AS orders
         FROM "Order" o JOIN "OrderItem" oi ON oi."orderId" = o.id
         WHERE o."createdAt" >= $1 AND o.status NOT IN ('CANCELLED','RETURNED') AND oi."sellerId" = $2 GROUP BY 1 ORDER BY 1`, from, sellerId)
    : await prisma.$queryRawUnsafe<{ bucket: Date; revenue: number; orders: number }[]>(
        `SELECT date_trunc('${unit}', "createdAt") AS bucket, COALESCE(SUM(total),0)::float AS revenue, COUNT(*)::int AS orders
         FROM "Order" WHERE "createdAt" >= $1 AND status NOT IN ('CANCELLED','RETURNED') GROUP BY 1 ORDER BY 1`, from);
  const out: { label: string; value: number; orders: number }[] = [];
  const cur = new Date(from);
  const now = new Date();
  while (cur <= now) {
    const match = rows.find((r) => {
      const b = new Date(r.bucket);
      return unit === "hour" ? b.getTime() === cur.getTime() : unit === "day" ? b.toDateString() === cur.toDateString() : b.getMonth() === cur.getMonth() && b.getFullYear() === cur.getFullYear();
    });
    out.push({
      label: unit === "hour" ? `${String(cur.getHours()).padStart(2, "0")}:00` : unit === "day" ? `${cur.getDate()} ${MONTHS[cur.getMonth()]}` : MONTHS[cur.getMonth()],
      value: Math.round(match?.revenue ?? 0),
      orders: match?.orders ?? 0,
    });
    if (unit === "hour") cur.setHours(cur.getHours() + 1);
    else if (unit === "day") cur.setDate(cur.getDate() + 1);
    else cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
