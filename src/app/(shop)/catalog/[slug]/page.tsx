import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogView } from "@/components/shop/catalog-view";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug }, select: { name: true, description: true } });
  return { title: c ? `${c.name} — купить в интернет-магазине` : "Категория", description: c?.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  return <CatalogView slug={slug} searchParams={await searchParams} />;
}
