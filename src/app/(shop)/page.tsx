import Link from "next/link";
import Image from "next/image";
import { BadgePercent, RotateCcw, ShieldCheck, Truck, Headset } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getHomeBlocks } from "@/lib/settings";
import { homeProducts } from "@/lib/catalog";
import { getNavCategories } from "@/lib/data";
import { Hero } from "@/components/shop/hero";
import { ProductRail } from "@/components/shop/rail";
import { CategoryIcon } from "@/components/shop/category-icon";

export default async function HomePage() {
  const blocks = (await getHomeBlocks()).filter((b) => b.enabled);
  const needs = new Set(blocks.map((b) => b.type));
  const [banners, promos, cats, brands, ...rails] = await Promise.all([
    needs.has("hero") ? prisma.banner.findMany({ where: { active: true, position: "HERO" }, orderBy: { sortOrder: "asc" } }) : [],
    needs.has("promo") ? prisma.banner.findMany({ where: { active: true, position: "PROMO" }, orderBy: { sortOrder: "asc" }, take: 3 }) : [],
    needs.has("categories") ? getNavCategories() : [],
    needs.has("brands") ? prisma.brand.findMany({ where: { popular: true }, orderBy: { sortOrder: "asc" }, take: 18 }) : [],
    ...blocks.map((b) => (b.type === "products" ? homeProducts(b.source ?? "hits", { category: b.category, limit: b.limit, productIds: b.productIds }) : Promise.resolve([]))),
  ]);

  return (
    <div className="container-tm pt-4 sm:pt-6">
      {blocks.map((b, idx) => {
        switch (b.type) {
          case "hero":
            return <Hero key={b.id} banners={banners} />;
          case "categories":
            return (
              <section key={b.id} className="mt-8 sm:mt-12">
                <h2 className="h-section mb-4">{b.title}</h2>
                <div className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-5 sm:gap-3 lg:grid-cols-8">
                  {cats.filter((c) => c.showOnHome).map((c, i) => (
                    <Link key={c.id} href={`/catalog/${c.slug}`} className="group flex animate-fade-up flex-col items-center gap-2 rounded-card bg-ink-50 px-2 py-4 text-center transition hover:-translate-y-0.5 hover:bg-brand-50" style={{ animationDelay: `${i * 30}ms` }}>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-card transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                        <CategoryIcon name={c.icon} size={26} />
                      </span>
                      <span className="text-xs font-semibold leading-tight sm:text-sm">{c.name}</span>
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
                      {p.image && <Image src={p.image} alt="" width={260} height={260} className="absolute -bottom-6 -right-4 h-[85%] w-auto object-contain transition duration-500 group-hover:scale-105" unoptimized={p.image.endsWith(".svg")} />}
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
                      {br.logo ? <Image src={br.logo} alt={br.name} width={120} height={40} className="max-h-10 w-auto object-contain" /> : br.name}
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
    </div>
  );
}
