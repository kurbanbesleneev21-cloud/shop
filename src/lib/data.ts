import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const getNavCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true, image: true, showOnHome: true, children: { where: { active: true }, select: { id: true, name: true, slug: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ["nav-categories"],
  { tags: ["categories"], revalidate: 600 },
);

export const getFooterPages = unstable_cache(
  async () => prisma.page.findMany({ where: { published: true, showInFooter: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, title: true } }),
  ["footer-pages"],
  { tags: ["pages"], revalidate: 600 },
);
