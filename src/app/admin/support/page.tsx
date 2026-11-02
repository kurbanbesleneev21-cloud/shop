import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters } from "@/components/admin/list-filters";
import { TicketsView } from "@/components/admin/moderation";

export const metadata = { title: "Поддержка" };

export default async function Support({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.SupportTicketWhereInput = {};
  if (sp.status) where.status = sp.status as never;
  if (sp.q) where.OR = [{ email: { contains: sp.q, mode: "insensitive" } }, { subject: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }];
  const rows = await prisma.supportTicket.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });
  return (
    <div>
      <PageHeader title="Обращения в поддержку" />
      <ListFilters placeholder="Email, имя или тема" selects={[{ name: "status", label: "Все", options: [["OPEN", "Открытые"], ["ANSWERED", "Отвеченные"], ["CLOSED", "Закрытые"]] }]} />
      <TicketsView rows={rows.map((t) => ({ id: t.id, name: t.name, email: t.email, subject: t.subject, message: t.message, status: t.status, reply: t.reply, createdAt: t.createdAt.toISOString(), orderId: t.orderId }))} />
    </div>
  );
}
