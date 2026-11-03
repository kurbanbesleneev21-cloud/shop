import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Stars } from "@/components/shop/stars";
import { SellerReplyForm } from "@/components/shop/seller-reply";
import { cn, formatDate } from "@/lib/utils";

export default async function SellerReviews({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const sellerId = (await getCurrentUser())!.seller!.id;
  const where = { product: { sellerId }, status: "APPROVED" as const, ...(f === "unanswered" ? { reply: null } : f === "negative" ? { rating: { lte: 3 } } : {}) };
  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } }, product: { select: { title: true, slug: true } } } }),
    prisma.review.aggregate({ where: { product: { sellerId }, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
  ]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-ink-50 px-4 py-2"><span className="text-2xl font-extrabold">{agg._avg.rating?.toFixed(1) ?? "—"}</span> <span className="text-sm text-ink-500">средняя оценка · {agg._count} отзывов</span></div>
        {[["", "Все"], ["unanswered", "Без ответа"], ["negative", "Оценка 3 и ниже"]].map(([k, l]) => <Link key={k} href={`/seller/reviews${k ? "?f=" + k : ""}`} className={cn("chip h-8 text-xs", (f ?? "") === k && "chip-active")}>{l}</Link>)}
      </div>
      {!reviews.length ? <div className="rounded-card bg-ink-50 p-10 text-center text-ink-500">Отзывов нет</div> : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-card border border-ink-100 p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Stars value={r.rating} />
                <b>{r.user.name.split(" ")[0]}</b>
                <span className="text-ink-500">{formatDate(r.createdAt)}</span>
                <Link href={`/product/${r.product.slug}`} className="text-brand hover:underline">{r.product.title}</Link>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {r.pros && <p><b>Достоинства:</b> {r.pros}</p>}
                {r.cons && <p><b>Недостатки:</b> {r.cons}</p>}
                <p className="text-ink-700">{r.text}</p>
              </div>
              <SellerReplyForm id={r.id} initial={r.reply ?? ""} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
