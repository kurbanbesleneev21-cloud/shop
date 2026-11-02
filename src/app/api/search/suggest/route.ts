import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWhere } from "@/lib/catalog";
import { memoryLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "x";
  if (q.length < 2 || !memoryLimit("suggest:" + ip, 120, 60_000)) return NextResponse.json({ products: [], categories: [] });
  const { where } = await buildWhere({ q });
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, take: 6, orderBy: { salesCount: "desc" }, select: { id: true, title: true, slug: true, price: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } }),
    prisma.category.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, take: 4, select: { name: true, slug: true } }),
  ]);
  return NextResponse.json(
    { products: products.map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: p.price, image: p.images[0]?.url ?? null })), categories },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
