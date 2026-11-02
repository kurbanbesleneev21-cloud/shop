import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const cardSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  oldPrice: true,
  rating: true,
  reviewsCount: true,
  stock: true,
  isNew: true,
  isHit: true,
  brand: { select: { name: true } },
  images: { select: { url: true }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], take: 2 },
} satisfies Prisma.ProductSelect;

export type CardProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type CatalogParams = {
  q?: string;
  category?: string;
  brand?: string[];
  min?: number;
  max?: number;
  color?: string[];
  memory?: string[];
  diagonal?: string[];
  processor?: string[];
  model?: string;
  rating?: number;
  inStock?: boolean;
  discount?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
  showOutOfStock?: boolean;
  seller?: string;
};

function arr(v: string | string[] | undefined) {
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean).slice(0, 30);
}

export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  const n = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  return {
    q: one("q")?.slice(0, 120),
    brand: arr(sp.brand),
    min: n("min"),
    max: n("max"),
    color: arr(sp.color),
    memory: arr(sp.memory),
    diagonal: arr(sp.diagonal),
    processor: arr(sp.processor),
    model: one("model")?.slice(0, 80),
    rating: n("rating"),
    inStock: one("stock") === "1",
    discount: one("discount") === "1",
    sort: one("sort"),
    page: Math.max(1, Math.min(500, Number(one("page")) || 1)),
    seller: one("seller")?.slice(0, 80),
  };
}

export async function categoryWithChildrenIds(slug: string) {
  const cat = await prisma.category.findUnique({ where: { slug }, include: { children: { select: { id: true } } } });
  if (!cat) return null;
  return { category: cat, ids: [cat.id, ...cat.children.map((c) => c.id)] };
}

export async function buildWhere(p: CatalogParams): Promise<{ where: Prisma.ProductWhereInput; notFound?: boolean }> {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };
  const and: Prisma.ProductWhereInput[] = [];
  if (p.category) {
    const c = await categoryWithChildrenIds(p.category);
    if (!c) return { where, notFound: true };
    and.push({ categoryId: { in: c.ids } });
  }
  if (p.q) {
    const words = p.q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const w of words) {
      and.push({
        OR: [
          { title: { contains: w, mode: "insensitive" } },
          { sku: { contains: w, mode: "insensitive" } },
          { model: { contains: w, mode: "insensitive" } },
          { keywords: { contains: w, mode: "insensitive" } },
          { brand: { name: { contains: w, mode: "insensitive" } } },
          { category: { name: { contains: w, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (p.brand?.length) and.push({ brand: { slug: { in: p.brand } } });
  if (p.min) and.push({ price: { gte: p.min } });
  if (p.max) and.push({ price: { lte: p.max } });
  if (p.color?.length) and.push({ color: { in: p.color } });
  if (p.memory?.length) and.push({ memory: { in: p.memory } });
  if (p.diagonal?.length) and.push({ diagonal: { in: p.diagonal } });
  if (p.processor?.length) and.push({ processor: { in: p.processor } });
  if (p.model) and.push({ model: { contains: p.model, mode: "insensitive" } });
  if (p.rating) and.push({ rating: { gte: p.rating } });
  if (p.inStock || p.showOutOfStock === false) and.push({ stock: { gt: 0 } });
  if (p.discount) and.push({ oldPrice: { gt: prisma.product.fields.price } });
  if (p.seller) and.push({ seller: { slug: p.seller } });
  if (and.length) where.AND = and;
  return { where };
}

export function orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ rating: "desc" }, { reviewsCount: "desc" }];
    case "price_asc":
      return [{ price: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "new":
      return [{ createdAt: "desc" }];
    case "discount":
      return [{ oldPrice: { sort: "desc", nulls: "last" } }];
    default:
      return [{ salesCount: "desc" }, { rating: "desc" }];
  }
}

export async function searchProducts(p: CatalogParams) {
  const { where, notFound } = await buildWhere(p);
  if (notFound) return { notFound: true as const, items: [], total: 0, pages: 0 };
  const perPage = p.perPage ?? 24;
  const page = p.page ?? 1;
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: orderBy(p.sort), skip: (page - 1) * perPage, take: perPage, select: cardSelect }),
    prisma.product.count({ where }),
  ]);
  return { items, total, pages: Math.ceil(total / perPage), notFound: false as const };
}

export async function facets(categorySlug?: string, q?: string) {
  const { where } = await buildWhere({ category: categorySlug, q });
  const [brands, colors, memory, diagonal, processor, price] = await Promise.all([
    prisma.product.groupBy({ by: ["brandId"], where, _count: true }),
    prisma.product.groupBy({ by: ["color"], where: { ...where, color: { not: null } }, _count: true }),
    prisma.product.groupBy({ by: ["memory"], where: { ...where, memory: { not: null } }, _count: true }),
    prisma.product.groupBy({ by: ["diagonal"], where: { ...where, diagonal: { not: null } }, _count: true }),
    prisma.product.groupBy({ by: ["processor"], where: { ...where, processor: { not: null } }, _count: true }),
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
  ]);
  const brandRows = await prisma.brand.findMany({
    where: { id: { in: brands.map((b) => b.brandId).filter((x): x is string => Boolean(x)) } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  const countOf = (id: string) => brands.find((b) => b.brandId === id)?._count ?? 0;
  const sortVals = (rows: { _count: number }[], key: string) =>
    rows
      .map((r) => ({ value: String((r as Record<string, unknown>)[key]), count: r._count }))
      .filter((r) => r.value && r.value !== "null")
      .sort((a, b) => a.value.localeCompare(b.value, "ru", { numeric: true }));
  return {
    brands: brandRows.map((b) => ({ value: b.slug, label: b.name, count: countOf(b.id) })),
    colors: sortVals(colors, "color"),
    memory: sortVals(memory, "memory"),
    diagonal: sortVals(diagonal, "diagonal"),
    processor: sortVals(processor, "processor"),
    priceMin: price._min.price ?? 0,
    priceMax: price._max.price ?? 0,
  };
}

export type Facets = Awaited<ReturnType<typeof facets>>;

export async function homeProducts(source: string, opts: { category?: string; limit?: number; productIds?: string[] }) {
  const take = Math.min(opts.limit ?? 10, 24);
  const base: Prisma.ProductWhereInput = { status: "PUBLISHED" };
  switch (source) {
    case "new":
      return prisma.product.findMany({ where: base, orderBy: [{ isNew: "desc" }, { createdAt: "desc" }], take, select: cardSelect });
    case "discount":
      return prisma.product.findMany({ where: { ...base, oldPrice: { gt: prisma.product.fields.price } }, orderBy: { salesCount: "desc" }, take, select: cardSelect });
    case "featured":
      return prisma.product.findMany({ where: { ...base, featured: true }, orderBy: { salesCount: "desc" }, take, select: cardSelect });
    case "manual": {
      const ids = opts.productIds ?? [];
      const items = await prisma.product.findMany({ where: { ...base, id: { in: ids } }, select: cardSelect });
      return ids.map((id) => items.find((i) => i.id === id)).filter((x): x is CardProduct => Boolean(x));
    }
    case "category": {
      if (!opts.category) return [];
      const c = await categoryWithChildrenIds(opts.category);
      if (!c) return [];
      return prisma.product.findMany({ where: { ...base, categoryId: { in: c.ids } }, orderBy: [{ salesCount: "desc" }], take, select: cardSelect });
    }
    case "hits":
    default:
      return prisma.product.findMany({ where: base, orderBy: [{ isHit: "desc" }, { salesCount: "desc" }], take, select: cardSelect });
  }
}
