"use client";

import Link from "next/link";
import { useRef } from "react";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { ProductImage } from "./product-image";
import { Stars } from "./stars";
import { cn, discountPercent, formatPrice, plural } from "@/lib/utils";
import { flyToCart } from "./fly-to-cart";

export type CardData = {
  id: string;
  title: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  rating: number;
  reviewsCount: number;
  stock: number;
  isNew: boolean;
  isHit: boolean;
  brand: { name: string } | null;
  images: { url: string }[];
};

export function ProductCard({ p, priority = false, index = 0 }: { p: CardData; priority?: boolean; index?: number }) {
  const { addToCart, cart, setQty, removeFromCart, favorites, toggleFavorite, config } = useApp();
  const imgRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const inCart = hydrated ? cart.find((c) => c.id === p.id) : undefined;
  const disc = discountPercent(p.price, p.oldPrice);
  const fav = favorites.has(p.id);
  const img = p.images[0]?.url;
  const img2 = p.images[1]?.url;
  const out = p.stock <= 0;

  return (
    <article
      className="product-card group relative flex flex-col rounded-card border border-ink-100 bg-white p-2 transition duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lift sm:p-3 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-[calc(var(--radius)*.8)] bg-ink-50" aria-label={p.title}>
        <div ref={imgRef} className="absolute inset-0 transition duration-500 ease-out group-hover:scale-[1.06]">
          <ProductImage src={img} alt={p.title} priority={priority} className={cn("object-contain transition-opacity duration-300", img2 && "group-hover:opacity-0")} />
          {img2 && <ProductImage src={img2} alt="" className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
        </div>
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {disc > 0 && <span className="badge bg-brand text-white">−{disc}%</span>}
          {p.isHit && <span className="badge bg-ink text-white">Хит</span>}
          {p.isNew && <span className="badge bg-white text-brand ring-1 ring-brand-200">Новинка</span>}
        </div>
        {out && <div className="absolute inset-x-0 bottom-0 bg-white/85 py-1.5 text-center text-xs font-semibold text-ink-600">Нет в наличии</div>}
      </Link>
      <button
        onClick={() => toggleFavorite(p.id)}
        className={cn("absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-card transition hover:scale-110 sm:right-4 sm:top-4", fav ? "text-brand" : "text-ink-500 hover:text-brand")}
        aria-label={fav ? "Убрать из избранного" : "В избранное"}
        aria-pressed={fav}
      >
        <Heart size={18} fill={fav ? "currentColor" : "none"} className={fav ? "animate-pop" : ""} />
      </button>

      <div className="mt-2.5 flex flex-1 flex-col px-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-lg font-extrabold leading-tight sm:text-xl", disc > 0 ? "text-brand" : "text-ink")}>{formatPrice(p.price, config.currency)}</span>
          {p.oldPrice && p.oldPrice > p.price && <span className="text-xs text-ink-400 line-through sm:text-sm">{formatPrice(p.oldPrice, config.currency)}</span>}
        </div>
        <Link href={`/product/${p.slug}`} className="mt-1 line-clamp-2 min-h-[2.5em] text-[13px] leading-snug text-ink-700 hover:text-brand sm:text-sm">
          {p.brand && <span className="font-semibold text-ink">{p.brand.name} </span>}
          {p.title.replace(p.brand?.name + " ", "")}
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
          {p.reviewsCount > 0 ? (
            <>
              <Stars value={p.rating} size={12} />
              <span className="font-semibold text-ink">{p.rating.toFixed(1)}</span>
              <span>· {p.reviewsCount} {plural(p.reviewsCount, ["отзыв", "отзыва", "отзывов"])}</span>
            </>
          ) : (
            <span>Нет отзывов</span>
          )}
        </div>
        <div className="mt-auto pt-3">
          {inCart ? (
            <div className="flex h-10 items-center justify-between rounded-btn bg-brand-50 px-1">
              <button className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-white" onClick={() => (inCart.qty > 1 ? setQty(p.id, inCart.qty - 1) : removeFromCart(p.id))} aria-label="Уменьшить">
                <Minus size={16} />
              </button>
              <Link href="/cart" className="text-sm font-semibold text-brand">{inCart.qty} шт · в корзине</Link>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-white disabled:opacity-40" disabled={inCart.qty >= Math.min(p.stock, config.cart.maxQtyPerItem)} onClick={() => setQty(p.id, inCart.qty + 1)} aria-label="Увеличить">
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              className="btn-primary h-10 w-full text-sm"
              disabled={out}
              onClick={() => {
                flyToCart(imgRef.current, img);
                addToCart({ id: p.id, slug: p.slug, title: p.title, price: p.price, oldPrice: p.oldPrice, image: img, stock: p.stock });
              }}
            >
              <ShoppingCart size={16} />
              {out ? "Нет в наличии" : "В корзину"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-ink-100 p-2 sm:p-3">
      <div className="skeleton aspect-square w-full" />
      <div className="skeleton mt-3 h-6 w-1/2" />
      <div className="skeleton mt-2 h-4 w-full" />
      <div className="skeleton mt-1.5 h-4 w-2/3" />
      <div className="skeleton mt-4 h-10 w-full" />
    </div>
  );
}

export function ProductGrid({ items, columns = 4, priorityCount = 0 }: { items: CardData[]; columns?: number; priorityCount?: number }) {
  const cols = columns === 5 ? "lg:grid-cols-4 xl:grid-cols-5" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4", cols)}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i} priority={i < priorityCount} />
      ))}
    </div>
  );
}
