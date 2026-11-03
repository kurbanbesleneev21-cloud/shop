import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

// Bulk data cleanup for administrators (e.g. removing demo data before launch).
// Every destructive action requires typing the confirmation word and is written to the audit log.

export const GET = route({ auth: "admin" }, async () => {
  const [products, reviews, orders, payouts, users, sellers, tickets] = await Promise.all([
    prisma.product.count(), prisma.review.count(), prisma.order.count(), prisma.payout.count(), prisma.user.count(), prisma.seller.count(), prisma.supportTicket.count(),
  ]);
  const userList = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } });
  return ok({ counts: { products, reviews, orders, payouts, users, sellers, tickets }, users: userList });
});

export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({
    action: z.enum(["purge-catalog", "purge-orders", "purge-users"]),
    confirm: z.literal("УДАЛИТЬ", "Введите слово УДАЛИТЬ для подтверждения"),
    keepUserIds: z.array(z.string().max(40)).max(50).optional().default([]),
  }));
  let result: Record<string, number> = {};
  if (data.action === "purge-catalog") {
    const [reviews, favorites, products] = await prisma.$transaction([
      prisma.review.deleteMany({}),
      prisma.favorite.deleteMany({}),
      prisma.product.deleteMany({}), // images cascade; order items keep their title/price snapshot
    ]);
    await prisma.aiDraft.updateMany({ data: { productId: null } });
    result = { reviews: reviews.count, favorites: favorites.count, products: products.count };
  } else if (data.action === "purge-orders") {
    const [payments, orders, payouts] = await prisma.$transaction([
      prisma.payment.deleteMany({}),
      prisma.order.deleteMany({}), // items and history cascade
      prisma.payout.deleteMany({}),
      prisma.promoCode.updateMany({ data: { usedCount: 0 } }),
    ]);
    result = { payments: payments.count, orders: orders.count, payouts: payouts.count };
  } else {
    // Never delete the administrator performing the action
    const keep = Array.from(new Set([...data.keepUserIds, user!.id]));
    const victims = await prisma.user.findMany({ where: { id: { notIn: keep } }, select: { id: true } });
    const ids = victims.map((v) => v.id);
    const [tickets, users] = await prisma.$transaction([
      prisma.supportTicket.deleteMany({ where: { OR: [{ userId: { in: ids } }, { userId: null }] } }),
      prisma.user.deleteMany({ where: { id: { in: ids } } }), // sellers, favorites, reviews, tokens cascade
    ]);
    result = { users: users.count, tickets: tickets.count };
  }
  await audit(user, `maintenance.${data.action}`, "maintenance", null, { ...result, keepUserIds: data.keepUserIds }, ip);
  revalidateTag("categories");
  revalidatePath("/", "layout");
  return ok({ ok: true, result });
});
