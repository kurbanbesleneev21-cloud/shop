import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  return { title: sp.q ? `Поиск: ${sp.q}` : "Каталог электроники" };
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView searchParams={await searchParams} />;
}
