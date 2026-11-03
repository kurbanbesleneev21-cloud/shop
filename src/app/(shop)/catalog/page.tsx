import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";
import { hasCatalogFilters } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  return {
    title: q ? `Поиск: ${q}` : "Каталог электроники",
    description: "Каталог электроники TECHMARKET: смартфоны, ноутбуки, наушники, телевизоры и гаджеты. Цены, характеристики, отзывы и доставка по России.",
    alternates: { canonical: "/catalog" },
    // search results and filtered/sorted lists are duplicates of the catalog: keep them out of the index
    robots: hasCatalogFilters(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView searchParams={await searchParams} />;
}
