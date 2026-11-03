import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const [products, cats, pages, sellers] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, take: 45000 }),
    // only categories that actually have products (directly or in subcategories)
    prisma.category.findMany({
      where: { active: true, OR: [{ products: { some: { status: "PUBLISHED" } } }, { children: { some: { products: { some: { status: "PUBLISHED" } } } } }] },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.seller.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/catalog/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...sellers.map((s) => ({ url: `${base}/shop/${s.slug}`, lastModified: s.updatedAt, priority: 0.5 })),
    ...pages.map((p) => ({ url: `${base}/info/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
