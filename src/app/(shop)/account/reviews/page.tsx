import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Stars } from "@/components/shop/stars";
import { ProductImage } from "@/components/shop/product-image";
import { formatDate } from "@/lib/utils";

const STATUS: Record<string, string> = { PENDING: "На модерации", APPROVED: "Опубликован", REJECTED: "Отклонён" };

export default async function MyReviewsPage() {
  const user = (await getCurrentUser())!;
  const [reviews, awaiting] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } },
      take: 100,
    }),
    prisma.orderItem.findMany({
      where: { order: { userId: user.id, status: "DELIVERED" }, productId: { not: null }, product: { status: "PUBLISHED", reviews: { none: { userId: user.id } } } },
      select: { productId: true, title: true, image: true, product: { select: { slug: true } } },
      distinct: ["productId"],
      take: 30,
    }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="hidden text-2xl font-extrabold lg:block">Мои отзывы</h1>
      {awaiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Ждут вашей оценки</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:px-0">
            {awaiting.map((a) => (
              <Link key={a.productId} href={`/product/${a.product?.slug}#reviews`} className="w-40 shrink-0 rounded-card border border-ink-100 p-3 transition hover:border-brand">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-ink-50"><ProductImage src={a.image} alt="" sizes="160px" /></span>
                <span className="mt-2 line-clamp-2 text-sm">{a.title}</span>
                <span className="mt-2 flex justify-center text-ink-200"><Stars value={0} size={18} /></span>
                <span className="btn-primary btn-sm mt-2 w-full">Оценить</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        {awaiting.length > 0 && <h2 className="mb-2 text-lg font-bold">Написанные отзывы</h2>}
        {!reviews.length ? (
          <div className="grid place-items-center rounded-card bg-ink-50 py-14 text-center">
            <MessageSquareText size={40} className="text-brand" />
            <h2 className="mt-3 text-xl font-bold">Отзывов пока нет</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">После получения заказа вы сможете оценить товары — это помогает другим покупателям</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <article key={r.id} className="rounded-card border border-ink-100 p-4">
                <Link href={`/product/${r.product.slug}`} className="flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-50"><ProductImage src={r.product.images[0]?.url} alt="" sizes="48px" /></span>
                  <span className="line-clamp-2 flex-1 text-sm font-medium hover:text-brand">{r.product.title}</span>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Stars value={r.rating} size={16} />
                  <span className="text-ink-500">{formatDate(r.createdAt)}</span>
                  <span className={r.status === "APPROVED" ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand" : "rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600"}>{STATUS[r.status]}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{r.text}</p>
                {r.reply && <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm"><b>Ответ продавца:</b> {r.reply}</div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
