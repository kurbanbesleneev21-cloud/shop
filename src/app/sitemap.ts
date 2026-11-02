import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const base = `https://${h.get("x-forwarded-host") || h.get("host")}`;
  const [products, cats, pages] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/catalog/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...pages.map((p) => ({ url: `${base}/info/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
