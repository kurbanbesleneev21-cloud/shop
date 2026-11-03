import Link from "next/link";
import Image from "next/image";
import { BadgePercent, RotateCcw, ShieldCheck, Truck, Headset, Flame, Sparkles, LayoutGrid, Store, PackageOpen } from "lucide-react";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-url";
import { getHomeBlocks } from "@/lib/settings";
import { homeProducts } from "@/lib/catalog";
import { getNavCategories } from "@/lib/data";
import { Hero } from "@/components/shop/hero";
import { ProductRail } from "@/components/shop/rail";
import { CategoryIcon } from "@/components/shop/category-icon";
import { ProductGrid } from "@/components/shop/product-card";
import { RecentlyViewed } from "@/components/shop/recent";

export const metadata = { alternates: { canonical: "/" } };

// Banners, brands and product count change rarely: cached and invalidated by the "catalog" tag
const homeStatic = unstable_cache(
  async () => {
    const [published, banners, promos, brands] = await Promise.all([
      prisma.product.count({ where: { status: "PUBLISHED" } }),
      prisma.banner.findMany({ where: { active: true, position: "HERO" }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, subtitle: true, image: true, link: true, buttonText: true } }),
      prisma.banner.findMany({ where: { active: true, position: "PROMO" }, orderBy: { sortOrder: "asc" }, take: 3, select: { id: true, title: true, subtitle: true, image: true, link: true, buttonText: true } }),
      prisma.brand.findMany({ where: { popular: true }, orderBy: { sortOrder: "asc" }, take: 18, select: { id: true, name: true, slug: true, logo: true } }),
    ]);
    return { published, banners, promos, brands };
  },
  ["home-static"],
  { revalidate: 120, tags: ["catalog"] },
);

export default async function HomePage() {
  const blocks = (await getHomeBlocks()).filter((b) => b.enabled);
  const needs = new Set(blocks.map((b) => b.type));
  const [{ published, banners, promos, brands }, recommended, cats, ...rails] = await Promise.all([
    homeStatic(),
    homeProducts("hits", { limit: 24 }),
    needs.has("categories") ? getNavCategories() : [],
    ...blocks.map((b) => (b.type === "products" ? homeProducts(b.source ?? "hits", { category: b.category, limit: b.limit, productIds: b.productIds }) : Promise.resolve([]))),
  ]);

  return (
    <div className="container-tm pt-4 sm:pt-6">
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", name: "TECHMARKET", url: SITE_URL, logo: `${SITE_URL}/favicon.svg` },
              { "@type": "WebSite", name: "TECHMARKET", url: SITE_URL, inLanguage: "ru", potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/catalog?q={search_term_string}`, "query-input": "required name=search_term_string" } },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      {blocks.map((b, idx) => {
        switch (b.type) {
          case "hero":
            return (
              <div key={b.id}>
                <Hero banners={banners} />
                <QuickLinks />
              </div>
            );
          case "categories":
            return (
              <section key={b.id} className="mt-8 sm:mt-12">
                <h2 className="h-section mb-4">{b.title}</h2>
                <div className="-mx-4 grid auto-cols-[84px] grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid-flow-row sm:grid-cols-5 sm:grid-rows-none sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-8">
                  {cats.filter((c) => c.showOnHome).map((c, i) => (
                    <Link key={c.id} href={`/catalog/${c.slug}`} className="group flex animate-fade-up flex-col items-center gap-2 rounded-card bg-ink-50 px-1.5 py-3 text-center sm:px-2 sm:py-4 transition hover:-translate-y-0.5 hover:bg-brand-50" style={{ animationDelay: `${i * 30}ms` }}>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-card transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                        <CategoryIcon name={c.icon} size={26} />
                      </span>
                      <span className="line-clamp-2 text-[11px] font-semibold leading-tight sm:text-sm">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          case "products": {
            const items = rails[idx] as Awaited<ReturnType<typeof homeProducts>>;
            const href = b.source === "category" ? `/catalog/${b.category}` : b.source === "new" ? "/catalog?sort=new" : b.source === "discount" ? "/catalog?discount=1" : "/catalog";
            return <ProductRail key={b.id} title={b.title} items={items} href={href} />;
          }
          case "promo":
            return promos.length ? (
              <section key={b.id} className="mt-10 sm:mt-14">
                <h2 className="h-section mb-4">{b.title}</h2>
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {promos.map((p, i) => (
                    <Link key={p.id} href={p.link || "/catalog"} className={`group relative flex min-h-[180px] overflow-hidden rounded-card p-6 transition hover:shadow-lift sm:min-h-[220px] sm:p-8 ${i % 2 ? "bg-brand text-white" : "bg-ink text-white"}`}>
                      <div className="relative z-10 max-w-[60%]">
                        <div className="text-xl font-extrabold leading-tight sm:text-2xl">{p.title}</div>
                        {p.subtitle && <div className="mt-2 text-sm text-white/75">{p.subtitle}</div>}
                        <span className="btn mt-5 h-10 bg-white text-sm text-ink group-hover:bg-ink-100">{p.buttonText || "Подробнее"}</span>
                      </div>
                      {p.image && <Image src={p.image} alt="" width={260} height={260} sizes="(max-width: 768px) 50vw, 260px" className="absolute -bottom-6 -right-4 h-[85%] w-auto object-contain transition duration-500 group-hover:scale-105" unoptimized={p.image.endsWith(".svg")} />}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null;
          case "brands":
            return (
              <section key={b.id} className="mt-10 sm:mt-14">
                <h2 className="h-section mb-4">{b.title}</h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
                  {brands.map((br) => (
                    <Link key={br.id} href={`/catalog?brand=${br.slug}`} className="grid h-16 place-items-center rounded-card border border-ink-100 bg-white px-3 text-center text-base font-black tracking-tight text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand sm:h-20 sm:text-lg">
                      {br.logo ? <Image src={br.logo} alt={br.name} width={120} height={40} sizes="120px" className="max-h-10 w-auto object-contain" /> : br.name}
                    </Link>
                  ))}
                </div>
              </section>
            );
          case "advantages":
            return (
              <section key={b.id} className="mt-10 sm:mt-14">
                <h2 className="h-section mb-4">{b.title}</h2>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
                  {[
                    [Truck, "Доставка от 1 дня", "Курьером, в пункт выдачи или почтой"],
                    [ShieldCheck, "Гарантия качества", "Только оригинальная техника"],
                    [BadgePercent, "Выгодные цены", "Скидки и промокоды каждый день"],
                    [RotateCcw, "Возврат 14 дней", "Без лишних вопросов"],
                    [Headset, "Поддержка 24/7", "Ответим в чате и по телефону"],
                  ].map(([Icon, t, d], i) => {
                    const I = Icon as typeof Truck;
                    return (
                      <div key={i} className={`rounded-card bg-ink-50 p-4 sm:p-5 ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
                        <I className="text-brand" size={26} />
                        <div className="mt-3 font-bold">{t as string}</div>
                        <div className="mt-1 text-sm text-ink-500">{d as string}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          default:
            return null;
        }
      })}
      {published === 0 ? (
        <section className="mt-10 grid place-items-center rounded-card bg-ink-50 px-6 py-14 text-center sm:mt-14">
          <PackageOpen size={44} className="text-brand" />
          <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">Скоро здесь появятся товары</h2>
          <p className="mt-2 max-w-md text-ink-500">Мы готовим витрину. Хотите продавать на TECHMARKET? Откройте магазин — это бесплатно.</p>
          <Link href="/seller/register" className="btn-primary mt-6"><Store size={18} />Стать продавцом</Link>
        </section>
      ) : (
        <>
          <RecentlyViewed title="Вы смотрели" />
          {recommended.length > 0 && (
            <section className="mt-10 sm:mt-14">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="h-section">Рекомендуем вам</h2>
                <Link href="/catalog" className="text-sm font-semibold text-brand hover:text-brand-600">Все товары</Link>
              </div>
              <ProductGrid items={recommended} columns={5} />
              {published > recommended.length && (
                <div className="mt-6 text-center"><Link href="/catalog" className="btn-outline">Показать ещё товары</Link></div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function QuickLinks() {
  const items = [
    { href: "/catalog?discount=1", label: "Скидки", icon: BadgePercent },
    { href: "/catalog?sort=new", label: "Новинки", icon: Sparkles },
    { href: "/catalog?sort=popular", label: "Хиты продаж", icon: Flame },
    { href: "/catalog", label: "Все товары", icon: LayoutGrid },
    { href: "/seller/register", label: "Продавцам", icon: Store },
  ];
  return (
    <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:mt-4 sm:px-0" aria-label="Быстрые ссылки">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="chip h-10 shrink-0 gap-2 text-sm font-semibold">
          <i.icon size={18} className="text-brand" />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
