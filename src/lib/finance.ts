import "server-only";
import { prisma } from "./prisma";

export type SellerFinance = { sellerId: string; turnover: number; commission: number; delivered: number; deliveredCommission: number; paid: number; pending: number; balance: number; orders: number; products: number };

export async function sellersFinance(sellerIds?: string[]): Promise<Record<string, SellerFinance>> {
  const whereSeller = sellerIds ? { sellerId: { in: sellerIds } } : { sellerId: { not: null } };
  const [all, delivered, payouts, products, orders] = await Promise.all([
    prisma.orderItem.groupBy({ by: ["sellerId"], where: { ...whereSeller, order: { status: { notIn: ["CANCELLED", "RETURNED"] } } }, _sum: { commission: true, price: true } , _count: true}),
    prisma.$queryRaw<{ sellerId: string; gross: number; commission: number }[]>`
      SELECT oi."sellerId", SUM(oi.price * oi.qty)::float AS gross, SUM(oi.commission)::float AS commission
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED' AND oi."sellerId" IS NOT NULL GROUP BY oi."sellerId"`,
    prisma.payout.groupBy({ by: ["sellerId", "status"], where: sellerIds ? { sellerId: { in: sellerIds } } : {}, _sum: { amount: true } }),
    prisma.product.groupBy({ by: ["sellerId"], where: whereSeller, _count: true }),
    prisma.$queryRaw<{ sellerId: string; n: number }[]>`SELECT oi."sellerId", COUNT(DISTINCT oi."orderId")::int AS n FROM "OrderItem" oi WHERE oi."sellerId" IS NOT NULL GROUP BY oi."sellerId"`,
  ]);
  // turnover needs price*qty — compute via raw
  const turnover = await prisma.$queryRaw<{ sellerId: string; gross: number }[]>`
    SELECT oi."sellerId", SUM(oi.price * oi.qty)::float AS gross FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status NOT IN ('CANCELLED','RETURNED') AND oi."sellerId" IS NOT NULL GROUP BY oi."sellerId"`;
  const out: Record<string, SellerFinance> = {};
  const ids = new Set<string>([...all.map((a) => a.sellerId!), ...payouts.map((p) => p.sellerId), ...products.map((p) => p.sellerId!), ...(sellerIds ?? [])].filter(Boolean));
  for (const id of ids) {
    const d = delivered.find((x) => x.sellerId === id);
    const paid = payouts.filter((p) => p.sellerId === id && p.status === "PAID").reduce((s, p) => s + (p._sum.amount ?? 0), 0);
    const pending = payouts.filter((p) => p.sellerId === id && p.status === "PENDING").reduce((s, p) => s + (p._sum.amount ?? 0), 0);
    const net = Math.round((d?.gross ?? 0) - (d?.commission ?? 0));
    out[id] = {
      sellerId: id,
      turnover: Math.round(turnover.find((x) => x.sellerId === id)?.gross ?? 0),
      commission: all.find((x) => x.sellerId === id)?._sum.commission ?? 0,
      delivered: Math.round(d?.gross ?? 0),
      deliveredCommission: Math.round(d?.commission ?? 0),
      paid,
      pending,
      balance: net - paid - pending,
      orders: orders.find((x) => x.sellerId === id)?.n ?? 0,
      products: products.find((x) => x.sellerId === id)?._count ?? 0,
    };
  }
  return out;
}

export async function operations(limit = 200, sellerId?: string) {
  const [orders, payouts] = await Promise.all([
    prisma.order.findMany({ where: sellerId ? { items: { some: { sellerId } } } : {}, orderBy: { createdAt: "desc" }, take: limit, select: { id: true, number: true, total: true, commissionTotal: true, status: true, paymentMethod: true, paymentStatus: true, createdAt: true, items: sellerId ? { where: { sellerId }, select: { price: true, qty: true, commission: true } } : false } }),
    prisma.payout.findMany({ where: sellerId ? { sellerId } : {}, orderBy: { createdAt: "desc" }, take: limit, include: { seller: { select: { shopName: true } } } }),
  ]);
  const ops = [
    ...orders.map((o) => {
      const items = (o as { items?: { price: number; qty: number; commission: number }[] }).items;
      const amount = items ? items.reduce((s, i) => s + i.price * i.qty, 0) : o.total;
      const commission = items ? items.reduce((s, i) => s + i.commission, 0) : o.commissionTotal;
      return { id: o.id, date: o.createdAt, type: "Заказ", ref: `№${o.number}`, amount, commission, status: o.status, note: `${o.paymentMethod} · ${o.paymentStatus}` };
    }),
    ...payouts.map((p) => ({ id: p.id, date: p.createdAt, type: "Выплата продавцу", ref: p.seller.shopName, amount: -p.amount, commission: 0, status: p.status, note: p.note ?? "" })),
  ];
  return ops.sort((a, b) => +b.date - +a.date).slice(0, limit);
}
