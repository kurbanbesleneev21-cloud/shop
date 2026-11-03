import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogView } from "@/components/shop/catalog-view";
import { hasCatalogFilters } from "@/lib/seo";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true, active: true, children: { select: { id: true } } },
  });
  if (!c || !c.active) return { title: "Категория не найдена", robots: { index: false } };
  const count = await prisma.product.count({ where: { status: "PUBLISHED", categoryId: { in: [c.id, ...c.children.map((x) => x.id)] } } });
  const description = c.description || `${c.name} — купить в интернет-магазине TECHMARKET. Цены, характеристики, отзывы покупателей и быстрая доставка.`;
  return {
    title: `${c.name} — купить в интернет-магазине`,
    description,
    alternates: { canonical: `/catalog/${slug}` },
    openGraph: { title: c.name, description, url: `/catalog/${slug}` },
    // empty categories and filtered variants are thin/duplicate pages
    robots: count === 0 || hasCatalogFilters(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  return <CatalogView slug={slug} searchParams={await searchParams} />;
}
