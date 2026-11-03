import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { orderTabWhere } from "@/lib/order-tabs";
import { ProfileHub } from "@/components/shop/profile-hub";

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const mine = { userId: user.id };
  const [unpaid, active, done, returns, total, addresses, reviews, awaiting, tickets, pages] = await Promise.all([
    prisma.order.count({ where: { ...mine, ...orderTabWhere("unpaid") } }),
    prisma.order.count({ where: { ...mine, ...orderTabWhere("active") } }),
    prisma.order.count({ where: { ...mine, ...orderTabWhere("done") } }),
    prisma.order.count({ where: { ...mine, ...orderTabWhere("returns") } }),
    prisma.order.aggregate({ where: { ...mine, status: { notIn: ["CANCELLED", "RETURNED"] } }, _sum: { total: true } }),
    prisma.address.count({ where: mine }),
    prisma.review.count({ where: mine }),
    prisma.orderItem.findMany({
      where: { order: { ...mine, status: "DELIVERED" }, productId: { not: null }, product: { reviews: { none: { userId: user.id } } } },
      select: { productId: true },
      distinct: ["productId"],
      take: 50,
    }),
    prisma.supportTicket.count({ where: { userId: user.id } }).catch(() => 0),
    prisma.page.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, title: true }, take: 8 }),
  ]);
  return (
    <ProfileHub
      user={{ name: user.name, email: user.email, phone: user.phone ?? "", emailVerified: Boolean(user.emailVerified), admin: user.role === "ADMIN", seller: user.seller?.status ?? null }}
      counts={{ unpaid, active, done, returns, addresses, reviews, awaiting: awaiting.length, tickets, spent: total._sum.total ?? 0 }}
      pages={pages}
    />
  );
}
