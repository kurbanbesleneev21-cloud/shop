import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Camera, Check, Package, Factory, Copy } from "lucide-react";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-url";
import { headers } from "next/headers";
import { cardSelect } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { asRecord, asStringArray, discountPercent, plural } from "@/lib/utils";
import { Gallery } from "@/components/shop/gallery";
import { BuyBox } from "@/components/shop/buy-box";
import { Reviews } from "@/components/shop/reviews";
import { ProductRail } from "@/components/shop/rail";
import { RecentlyViewed } from "@/components/shop/recent";
import { SectionNav, SpecsTable } from "@/components/shop/product-tabs";
import { Stars } from "@/components/shop/stars";

async function load(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      brand: true,
      category: { include: { parent: { select: { name: true, slug: true } } } },
      seller: { select: { id: true, shopName: true, slug: true, rating: true, status: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { title: true, seoTitle: true, seoDescription: true, shortDescription: true, keywords: true, status: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } });
  if (!p) return { title: "Товар не найден" };
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.shortDescription || undefined,
    keywords: p.keywords || undefined,
    robots: p.status === "PUBLISHED" ? undefined : { index: false },
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      type: "website",
      url: `/product/${slug}`,
      locale: "ru_RU",
      title: p.seoTitle || p.title,
      description: p.seoDescription || p.shortDescription || undefined,
      images: p.images[0]?.url && !p.images[0].url.endsWith(".svg") ? [p.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, user, s] = await Promise.all([load(slug), getCurrentUser(), getSettings()]);
  if (!p) notFound();
  const isOwner = user?.role === "ADMIN" || (user?.seller && user.seller.id === p.sellerId);
  if (p.status !== "PUBLISHED" && !isOwner) notFound();
  const pc = s.product as Record<string, unknown>;
  const sec = s.security as Record<string, unknown>;

  // after(): runs once the response is sent, without being cut off on serverless
  after(() => prisma.product.update({ where: { id: p.id }, data: { viewsCount: { increment: 1 } } }).catch(() => undefined));

  const [reviews, distRaw, similar, together, delivered, myReview] = await Promise.all([
    prisma.review.findMany({ where: { productId: p.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } } } }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: p.id, status: "APPROVED" }, _count: true }),
    pc.showSimilar ? prisma.product.findMany({ where: { status: "PUBLISHED", categoryId: p.categoryId, id: { not: p.id } }, orderBy: { salesCount: "desc" }, take: 12, select: cardSelect }) : [],
    pc.showBoughtTogether
      ? prisma.$queryRaw<{ productId: string; c: bigint }[]>`
          SELECT oi2."productId", COUNT(*) AS c FROM "OrderItem" oi1
          JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi2."productId" <> oi1."productId"
          WHERE oi1."productId" = ${p.id} AND oi2."productId" IS NOT NULL
          GROUP BY oi2."productId" ORDER BY c DESC LIMIT 12`
      : [],
    user ? prisma.orderItem.findFirst({ where: { productId: p.id, order: { userId: user.id, status: "DELIVERED" } }, select: { id: true } }) : null,
    user ? prisma.review.findUnique({ where: { productId_userId: { productId: p.id, userId: user.id } }, select: { status: true } }) : null,
  ]);
  let togetherItems = together.length
    ? await prisma.product.findMany({ where: { id: { in: together.map((t) => t.productId) }, status: "PUBLISHED" }, select: cardSelect })
    : [];
  if (pc.showBoughtTogether && togetherItems.length < 4) {
    // fall back to popular accessories from other categories
    const extra = await prisma.product.findMany({ where: { status: "PUBLISHED", categoryId: { not: p.categoryId }, id: { notIn: togetherItems.map((t) => t.id) } }, orderBy: { salesCount: "desc" }, take: 10 - togetherItems.length, select: cardSelect });
    togetherItems = [...togetherItems, ...extra];
  }

  const dist = [1, 2, 3, 4, 5].map((r) => distRaw.find((d) => d.rating === r)?._count ?? 0);
  const count = dist.reduce((a, b) => a + b, 0);
  const avg = count ? dist.reduce((sum, c, i) => sum + c * (i + 1), 0) / count : 0;
  const canReview = !user
    ? { allowed: false }
    : myReview
      ? { allowed: false, reason: myReview.status === "PENDING" ? "Ваш отзыв на модерации." : "Вы уже оставили отзыв на этот товар." }
      : !delivered
        ? { allowed: false, reason: "Оставить отзыв можно после получения заказа с этим товаром." }
        : { allowed: true };

  const template = (Array.isArray(p.category.specTemplate) ? p.category.specTemplate : []) as { key: string; label: string }[];
  const specs = asRecord(p.specs);
  const specRows = [
    ...template.filter((t) => specs[t.key]).map((t) => ({ label: t.label, value: specs[t.key] })),
    ...Object.entries(specs).filter(([k]) => !template.some((t) => t.key === k)).map(([k, v]) => ({ label: k, value: v })),
    ...(p.brand ? [{ label: "Бренд", value: p.brand.name }] : []),
    ...(p.model ? [{ label: "Модель", value: p.model }] : []),
    { label: "Артикул", value: p.sku },
  ];
  const advantages = asStringArray(p.advantages);
  const features = asStringArray(p.features);
  const equipment = asStringArray(p.equipment);
  const disc = discountPercent(p.price, p.oldPrice);
  const sections = [
    { id: "description", label: "Описание" },
    { id: "specs", label: "Характеристики" },
    { id: "reviews", label: `Отзывы ${count ? count : ""}` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: p.sku,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    description: p.shortDescription ?? undefined,
    image: p.images.map((i) => i.url).filter((u) => !u.endsWith(".svg")).map((u) => (u.startsWith("http") ? u : SITE_URL + u)),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${p.slug}`,
      priceCurrency: "RUB",
      price: p.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: p.seller?.shopName || "TECHMARKET" },
    },
    aggregateRating: count ? { "@type": "AggregateRating", ratingValue: Number(avg.toFixed(1)), reviewCount: count } : undefined,
  };
  const crumbs = [
    { name: "Главная", url: SITE_URL },
    { name: "Каталог", url: `${SITE_URL}/catalog` },
    ...(p.category.parent ? [{ name: p.category.parent.name, url: `${SITE_URL}/catalog/${p.category.parent.slug}` }] : []),
    { name: p.category.name, url: `${SITE_URL}/catalog/${p.category.slug}` },
    { name: p.title, url: `${SITE_URL}/product/${p.slug}` },
  ];
  const breadcrumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) };

  return (
    <div className="container-tm pt-4 sm:pt-6">
      <script type="application/ld+json" nonce={(await headers()).get("x-nonce") ?? undefined} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" nonce={(await headers()).get("x-nonce") ?? undefined} dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      {p.status !== "PUBLISHED" && (
        <div className="mb-4 rounded-card bg-brand px-4 py-3 text-sm font-medium text-white">
          Предварительный просмотр: товар {p.status === "DRAFT" ? "в черновиках" : "скрыт"} и не виден покупателям.
        </div>
      )}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-ink-500" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-brand">Главная</Link>
        <ChevronRight size={14} />
        {p.category.parent && (<><Link href={`/catalog/${p.category.parent.slug}`} className="hover:text-brand">{p.category.parent.name}</Link><ChevronRight size={14} /></>)}
        <Link href={`/catalog/${p.category.slug}`} className="hover:text-brand">{p.category.name}</Link>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_340px] lg:gap-8">
        <div className="animate-fade-up"><Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} title={p.title} /></div>

        <div className="min-w-0 animate-fade-up [animation-delay:60ms]">
          {p.brand && <Link href={`/catalog?brand=${p.brand.slug}`} className="text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-600">{p.brand.name}</Link>}
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{p.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <a href="#reviews" className="flex items-center gap-1.5 hover:text-brand">
              <Stars value={avg} size={15} />
              <span className="font-semibold">{count ? avg.toFixed(1) : "—"}</span>
              <span className="text-ink-500">{count} {plural(count, ["отзыв", "отзыва", "отзывов"])}</span>
            </a>
            <span className="flex items-center gap-1 text-ink-500"><Camera size={15} /> {p.images.length} {plural(p.images.length, ["фото", "фото", "фото"])}</span>
            <span className="flex items-center gap-1 text-ink-500"><Copy size={14} /> Артикул: <span className="font-medium text-ink">{p.sku}</span></span>
          </div>
          {disc > 0 && <div className="mt-3 inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand">Скидка {disc}%</div>}
          {p.shortDescription && <p className="mt-4 text-[15px] leading-relaxed text-ink-700">{p.shortDescription}</p>}
          <div className="mt-5 rounded-card bg-ink-50 p-4">
            <div className="mb-2 text-sm font-bold">Коротко о товаре</div>
            <dl className="space-y-1.5 text-sm">
              {specRows.slice(0, 6).map((r) => (
                <div key={r.label} className="flex gap-2"><dt className="text-ink-500">{r.label}:</dt><dd className="font-medium">{r.value}</dd></div>
              ))}
            </dl>
            <a href="#specs" className="mt-2 inline-block text-sm font-semibold text-brand">Все характеристики →</a>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms] lg:sticky lg:top-32 lg:self-start">
          <BuyBox
            p={{ id: p.id, slug: p.slug, title: p.title, price: p.price, oldPrice: p.oldPrice, stock: p.stock, image: p.images[0]?.url ?? null }}
            seller={p.seller && p.seller.status === "APPROVED" ? { shopName: p.seller.shopName, slug: p.seller.slug, rating: p.seller.rating } : null}
            deliveryText={String(pc.deliveryText)}
            showSeller={Boolean(pc.showSeller)}
            showDelivery={Boolean(pc.showDelivery)}
          />
        </div>
      </div>

      <SectionNav sections={sections} />

      <section id="description" className="scroll-mt-32 pt-8">
        <h2 className="h-section mb-4">Описание</h2>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{p.description || "Описание товара скоро появится."}</div>
          <div className="space-y-5">
            {advantages.length > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Преимущества</h3>
                <ul className="space-y-2">{advantages.map((a) => <li key={a} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-brand" />{a}</li>)}</ul>
              </div>
            )}
            {features.length > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Особенности</h3>
                <ul className="space-y-2">{features.map((a) => <li key={a} className="flex gap-2 text-sm"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{a}</li>)}</ul>
              </div>
            )}
            {equipment.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-bold"><Package size={18} className="text-brand" />Комплектация</h3>
                <ul className="flex flex-wrap gap-2">{equipment.map((a) => <li key={a} className="rounded-full bg-ink-100 px-3 py-1 text-sm">{a}</li>)}</ul>
              </div>
            )}
            {p.manufacturerInfo && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-bold"><Factory size={18} className="text-brand" />О производителе</h3>
                <p className="text-sm leading-relaxed text-ink-600">{p.manufacturerInfo}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="specs" className="scroll-mt-32 pt-10">
        <h2 className="h-section mb-4">Характеристики</h2>
        <SpecsTable groups={specRows} />
      </section>

      <section id="reviews" className="scroll-mt-32 pt-10">
        <h2 className="h-section mb-5">Отзывы покупателей</h2>
        <Reviews
          productId={p.id}
          reviews={reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text, pros: r.pros, cons: r.cons, photos: asStringArray(r.photos), createdAt: r.createdAt.toISOString(), userName: r.user.name.split(" ")[0] + (r.user.name.split(" ")[1] ? " " + r.user.name.split(" ")[1][0] + "." : ""), reply: r.reply, replyAt: r.replyAt?.toISOString() ?? null }))}
          avg={avg}
          count={count}
          dist={dist}
          canReview={canReview}
          photosEnabled={Boolean(pc.reviewPhotos)}
          maxMb={Number(sec.maxUploadMb) || 10}
        />
      </section>

      {similar.length > 0 && <ProductRail title="Похожие товары" items={similar} href={`/catalog/${p.category.slug}`} />}
      {togetherItems.length > 0 && <ProductRail title="С этим товаром покупают" items={togetherItems} />}
      {Boolean(pc.showRecent) && <RecentlyViewed excludeId={p.id} />}
    </div>
  );
}
