import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { facets as getFacets, parseCatalogParams, searchProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { plural } from "@/lib/utils";
import { CatalogShell, Pagination } from "./catalog-shell";
import { ProductGrid } from "./product-card";

export async function CatalogView({ slug, searchParams }: { slug?: string; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await getSettings();
  const cfg = s.catalog as { perPage: number; defaultSort: string; showOutOfStock: boolean; showFilters: boolean; columns: string };
  const params = parseCatalogParams(searchParams);
  params.category = slug;
  params.perPage = cfg.perPage;
  params.sort = params.sort || cfg.defaultSort;
  params.showOutOfStock = cfg.showOutOfStock;

  const category = slug
    ? await prisma.category.findUnique({ where: { slug }, include: { parent: { select: { name: true, slug: true } }, children: { where: { active: true }, select: { name: true, slug: true }, orderBy: { sortOrder: "asc" } } } })
    : null;
  if (slug && (!category || !category.active)) notFound();

  const [result, facets] = await Promise.all([searchProducts(params), getFacets(slug, params.q)]);
  const title = params.q ? `Результаты по запросу «${params.q}»` : category?.name ?? (params.discount ? "Товары со скидкой" : "Все товары");

  return (
    <div className="container-tm pt-4 sm:pt-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-ink-500" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-brand">Главная</Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="hover:text-brand">Каталог</Link>
        {category?.parent && (<><ChevronRight size={14} /><Link href={`/catalog/${category.parent.slug}`} className="hover:text-brand">{category.parent.name}</Link></>)}
        {category && (<><ChevronRight size={14} /><span className="text-ink">{category.name}</span></>)}
      </nav>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <span className="text-ink-500">{result.total} {plural(result.total, ["товар", "товара", "товаров"])}</span>
      </div>
      {category && category.children.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {category.children.map((c) => <Link key={c.slug} href={`/catalog/${c.slug}`} className="chip shrink-0">{c.name}</Link>)}
        </div>
      )}
      <div className="mt-4">
        <CatalogShell facets={facets} defaultSort={cfg.defaultSort} showFilters={cfg.showFilters} total={result.total}>
          {result.items.length ? (
            <>
              <ProductGrid items={result.items} columns={Number(cfg.columns) || 4} priorityCount={2} />
              <Pagination page={params.page ?? 1} pages={result.pages} />
            </>
          ) : (
            <div className="grid place-items-center rounded-card bg-ink-50 px-6 py-16 text-center">
              <SearchX size={44} className="text-brand" />
              <h2 className="mt-4 text-xl font-bold">Ничего не найдено</h2>
              <p className="mt-2 max-w-md text-ink-500">Попробуйте изменить запрос или сбросить фильтры — у нас тысячи товаров.</p>
              <Link href={slug ? `/catalog/${slug}` : "/catalog"} className="btn-primary mt-6">Сбросить фильтры</Link>
            </div>
          )}
        </CatalogShell>
      </div>
    </div>
  );
}
