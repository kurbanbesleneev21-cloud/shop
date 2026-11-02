import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters, Pager } from "@/components/admin/list-filters";
import { UsersView } from "@/components/admin/users-view";

export const metadata = { title: "Покупатели" };
const PER = 40;

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  if (sp.role) where.role = sp.role as never;
  if (sp.blocked) where.blocked = sp.blocked === "1";
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { orders: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, total: true, status: true, createdAt: true } }, tickets: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, subject: true, status: true, createdAt: true } }, _count: { select: { orders: true } } } }),
    prisma.user.count({ where }),
  ]);
  const spent = await prisma.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, status: { notIn: ["CANCELLED", "RETURNED"] } }, _sum: { total: true } });
  return (
    <div>
      <PageHeader title="Покупатели" subtitle={`Всего ${total} пользователей`} />
      <ListFilters placeholder="Имя, email или телефон" selects={[{ name: "role", label: "Все роли", options: [["BUYER", "Покупатели"], ["SELLER", "Продавцы"], ["ADMIN", "Администраторы"]] }, { name: "blocked", label: "Любой статус", options: [["1", "Заблокированные"], ["0", "Активные"]] }]} />
      <UsersView rows={users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, blocked: u.blocked, blockReason: u.blockReason, emailVerified: Boolean(u.emailVerified), createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null, ordersCount: u._count.orders, spent: spent.find((s) => s.userId === u.id)?._sum.total ?? 0, orders: u.orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })), tickets: u.tickets.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })) }))} />
      <Pager page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
