import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Store, ShieldCheck, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/product-card";
import { formatDate, plural } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await prisma.seller.findUnique({ where: { slug }, select: { shopName: true, description: true } });
  return { title: s ? `Магазин ${s.shopName}` : "Магазин", description: s?.description ?? undefined };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await prisma.seller.findUnique({ where: { slug } });
  if (!s || s.status !== "APPROVED") notFound();
  const [products, stats] = await Promise.all([
    prisma.product.findMany({ where: { sellerId: s.id, status: "PUBLISHED" }, orderBy: { salesCount: "desc" }, take: 60, select: cardSelect }),
    prisma.review.aggregate({ where: { product: { sellerId: s.id }, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
  ]);
  return (
    <div className="container-tm pt-4 sm:pt-6">
      <div className="flex flex-wrap items-center gap-4 rounded-card bg-ink p-5 text-white sm:p-8">
        <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-ink">{s.logo ? <Image src={s.logo} alt="" fill className="object-contain" sizes="64px" /> : <Store size={28} />}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{s.shopName}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            <span>★ {(stats._avg.rating ?? s.rating).toFixed(1)} · {stats._count} {plural(stats._count, ["отзыв", "отзыва", "отзывов"])}</span>
            <span className="flex items-center gap-1"><Package size={14} />{products.length} товаров</span>
            <span className="flex items-center gap-1"><ShieldCheck size={14} />на VITRINA с {formatDate(s.createdAt)}</span>
          </div>
        </div>
      </div>
      {(s.description || s.returnPolicy) && (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {s.description && <div className="rounded-card bg-ink-50 p-4"><b>О магазине</b><p className="mt-1 whitespace-pre-line text-ink-600">{s.description}</p></div>}
          {s.returnPolicy && <div className="rounded-card bg-ink-50 p-4"><b>Условия возврата</b><p className="mt-1 whitespace-pre-line text-ink-600">{s.returnPolicy}</p></div>}
        </div>
      )}
      {s.legalName && <p className="mt-3 text-xs text-ink-500">Продавец: {s.legalName}{s.inn ? `, ИНН ${s.inn}` : ""}</p>}
      <div className="mt-6">{products.length ? <ProductGrid items={products} columns={5} /> : <p className="text-ink-500">Товаров пока нет</p>}</div>
    </div>
  );
}
