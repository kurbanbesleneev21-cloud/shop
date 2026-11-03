import "server-only";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "./prisma";
import { slugify } from "./utils";
import { safeHref } from "./settings";
import { isAllowedImageUrl } from "./url-safety";

const img = z.string().trim().max(1000).optional().nullable().transform((v) => (v ? v : null)).refine((v) => !v || isAllowedImageUrl(v), "Изображение должно быть загружено через менеджер изображений");
const link = z.string().trim().max(300).optional().nullable().transform((v) => (v ? safeHref(v) || null : null));
const optDate = z.string().optional().nullable().transform((v) => (v ? new Date(v) : null));

type Res = {
  schema: z.ZodTypeAny;
  model: string;
  prepare?: (d: Record<string, unknown>, id?: string) => Promise<Record<string, unknown>> | Record<string, unknown>;
  canDelete?: (id: string) => Promise<string | null>;
  tags?: string[];
  order: Record<string, "asc" | "desc">[];
};

export const RESOURCES: Record<string, Res> = {
  categories: {
    model: "category",
    schema: z.object({
      name: z.string().trim().min(2, "Введите название").max(80),
      slug: z.string().trim().max(80).optional().default(""),
      description: z.string().trim().max(500).optional().nullable(),
      icon: z.string().trim().max(40).optional().nullable(),
      image: img,
      parentId: z.string().optional().nullable().transform((v) => v || null),
      sortOrder: z.coerce.number().int().default(0),
      active: z.boolean().default(true),
      showOnHome: z.boolean().default(true),
      specTemplate: z.array(z.object({ key: z.string().trim().min(1).max(40), label: z.string().trim().min(1).max(80), filter: z.enum(["", "color", "memory", "diagonal", "processor"]).optional() })).max(60).default([]),
    }),
    prepare: async (d, id) => {
      if (d.parentId && d.parentId === id) throw new Error("Категория не может быть родителем самой себя");
      const slug = slugify(String(d.slug || d.name));
      const ex = await prisma.category.findUnique({ where: { slug } });
      if (ex && ex.id !== id) throw new Error("Категория с таким адресом уже существует");
      const tpl = (d.specTemplate as { key: string; label: string; filter?: string }[]).map((t) => ({ key: slugify(t.key).replace(/-/g, "_") || t.key, label: t.label, ...(t.filter ? { filter: t.filter } : {}) }));
      return { ...d, slug, specTemplate: tpl };
    },
    canDelete: async (id) => {
      const n = await prisma.product.count({ where: { categoryId: id } });
      return n ? `В категории ${n} товаров — сначала перенесите их` : null;
    },
    tags: ["categories"],
    order: [{ sortOrder: "asc" }],
  },
  brands: {
    model: "brand",
    schema: z.object({ name: z.string().trim().min(1).max(80), slug: z.string().trim().max(80).optional().default(""), logo: img, description: z.string().trim().max(1000).optional().nullable(), popular: z.boolean().default(false), sortOrder: z.coerce.number().int().default(0) }),
    prepare: async (d, id) => {
      const slug = slugify(String(d.slug || d.name));
      const ex = await prisma.brand.findUnique({ where: { slug } });
      if (ex && ex.id !== id) throw new Error("Бренд с таким адресом уже существует");
      return { ...d, slug };
    },
    order: [{ sortOrder: "asc" }],
  },
  banners: {
    model: "banner",
    schema: z.object({ title: z.string().trim().min(2).max(160), subtitle: z.string().trim().max(300).optional().nullable(), image: img, link, buttonText: z.string().trim().max(40).optional().nullable(), position: z.enum(["HERO", "PROMO"]).default("HERO"), sortOrder: z.coerce.number().int().default(0), active: z.boolean().default(true) }),
    order: [{ position: "asc" }, { sortOrder: "asc" }],
  },
  pages: {
    model: "page",
    schema: z.object({ title: z.string().trim().min(2).max(160), slug: z.string().trim().max(80).optional().default(""), content: z.string().max(50000).default(""), published: z.boolean().default(true), showInFooter: z.boolean().default(true), sortOrder: z.coerce.number().int().default(0), seoTitle: z.string().trim().max(200).optional().nullable(), seoDescription: z.string().trim().max(400).optional().nullable() }),
    prepare: async (d, id) => {
      const slug = slugify(String(d.slug || d.title));
      const ex = await prisma.page.findUnique({ where: { slug } });
      if (ex && ex.id !== id) throw new Error("Страница с таким адресом уже существует");
      return { ...d, slug };
    },
    tags: ["pages"],
    order: [{ sortOrder: "asc" }],
  },
  promos: {
    model: "promoCode",
    schema: z.object({
      code: z.string().trim().min(3).max(40).transform((v) => v.toUpperCase().replace(/\s/g, "")),
      type: z.enum(["PERCENT", "FIXED"]),
      value: z.coerce.number().int().min(1, "Укажите размер скидки"),
      minOrder: z.coerce.number().int().min(0).default(0),
      maxUses: z.union([z.coerce.number().int().min(1), z.literal(""), z.null()]).optional().transform((v) => (v === "" || v == null ? null : v)),
      startsAt: optDate,
      endsAt: optDate,
      productIds: z.array(z.string()).max(500).default([]),
      categoryIds: z.array(z.string()).max(100).default([]),
      active: z.boolean().default(true),
    }),
    prepare: async (d, id) => {
      if (d.type === "PERCENT" && Number(d.value) > 100) throw new Error("Процент скидки не может быть больше 100");
      const ex = await prisma.promoCode.findUnique({ where: { code: String(d.code) } });
      if (ex && ex.id !== id) throw new Error("Такой промокод уже существует");
      return d;
    },
    order: [{ createdAt: "desc" }],
  },
};

export function revalidateResource(name: string) {
  RESOURCES[name]?.tags?.forEach((t) => revalidateTag(t));
  revalidatePath("/", "layout");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const delegate = (model: string) => (prisma as any)[model];
