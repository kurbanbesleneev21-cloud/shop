import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters, Pager } from "@/components/admin/list-filters";
import { ReviewsModeration } from "@/components/admin/moderation";
import { asStringArray } from "@/lib/utils";

export const metadata = { title: "Отзывы" };
const PER = 20;

export default async function Reviews({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ReviewWhereInput = {};
  if (sp.status === "complaints") where.complaints = { gt: 0 };
  else if (sp.status) where.status = sp.status as never;
  if (sp.q) where.OR = [{ text: { contains: sp.q, mode: "insensitive" } }, { product: { title: { contains: sp.q, mode: "insensitive" } } }];
  if (sp.rating) where.rating = Number(sp.rating);
  const [rows, total, pending, complaints] = await Promise.all([
    prisma.review.findMany({ where, orderBy: [{ status: "asc" }, { complaints: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PER, take: PER, include: { user: { select: { name: true, email: true } }, product: { select: { title: true, slug: true } } } }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { complaints: { gt: 0 } } }),
  ]);
  return (
    <div>
      <PageHeader title="Отзывы" subtitle={`На модерации: ${pending} · с жалобами: ${complaints}`} />
      <ListFilters placeholder="Текст отзыва или товар" selects={[{ name: "status", label: "Все отзывы", options: [["PENDING", "На модерации"], ["APPROVED", "Опубликованные"], ["REJECTED", "Отклонённые"], ["complaints", "С жалобами"]] }, { name: "rating", label: "Любая оценка", options: [["5", "5"], ["4", "4"], ["3", "3"], ["2", "2"], ["1", "1"]] }]} />
      <ReviewsModeration rows={rows.map((r) => ({ id: r.id, rating: r.rating, text: r.text, pros: r.pros, cons: r.cons, photos: asStringArray(r.photos), status: r.status, reply: r.reply, complaints: r.complaints, reasons: (Array.isArray(r.complaintReasons) ? r.complaintReasons : []).map((x) => String((x as { reason?: string })?.reason ?? "")), createdAt: r.createdAt.toISOString(), user: `${r.user.name} (${r.user.email})`, product: r.product.title, productSlug: r.product.slug }))} />
      <Pager page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
