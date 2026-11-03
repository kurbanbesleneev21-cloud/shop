"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, ShieldCheck, ShoppingCart, Store, Truck, Zap, RotateCcw } from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { cn, discountPercent, formatPrice } from "@/lib/utils";
import { flyToCart } from "./fly-to-cart";

export type BuyProduct = { id: string; slug: string; title: string; price: number; oldPrice: number | null; stock: number; image: string | null };

export function BuyBox({ p, seller, deliveryText, showSeller, showDelivery }: { p: BuyProduct; seller: { shopName: string; slug: string; rating: number } | null; deliveryText: string; showSeller: boolean; showDelivery: boolean }) {
  const { addToCart, cart, favorites, toggleFavorite, config } = useApp();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const inCart = hydrated ? cart.find((c) => c.id === p.id) : undefined;
  const disc = discountPercent(p.price, p.oldPrice);
  const max = Math.min(p.stock, config.cart.maxQtyPerItem);
  const fav = favorites.has(p.id);
  const out = p.stock <= 0;

  useEffect(() => {
    // remember recently viewed products
    try {
      const prev: string[] = JSON.parse(localStorage.getItem("tm_recent") || "[]");
      localStorage.setItem("tm_recent", JSON.stringify([p.id, ...prev.filter((x) => x !== p.id)].slice(0, 20)));
    } catch {}
  }, [p.id]);

  const item = { id: p.id, slug: p.slug, title: p.title, price: p.price, oldPrice: p.oldPrice, image: p.image, stock: p.stock };

  return (
    <div ref={ref} className="space-y-3">
      <div className="rounded-card border border-ink-100 p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-3xl font-extrabold tracking-tight", disc ? "text-brand" : "text-ink")}>{formatPrice(p.price, config.currency)}</span>
          {p.oldPrice && p.oldPrice > p.price && (
            <>
              <span className="text-lg text-ink-400 line-through">{formatPrice(p.oldPrice, config.currency)}</span>
              <span className="badge bg-brand text-sm text-white">−{disc}%</span>
            </>
          )}
        </div>
        {disc > 0 && p.oldPrice && <div className="mt-1 text-sm font-medium text-brand">Выгода {formatPrice(p.oldPrice - p.price, config.currency)}</div>}
        <div className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", out ? "bg-ink-100 text-ink-600" : "bg-brand-50 text-brand")}>
          <span className={cn("h-2 w-2 rounded-full", out ? "bg-ink-400" : "bg-brand")} />
          {out ? "Нет в наличии" : p.stock <= 5 ? `Осталось ${p.stock} шт.` : "В наличии"}
        </div>

        {!out && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-ink-500">Количество</span>
            <div className="flex h-10 items-center rounded-btn border border-ink-200">
              <button className="grid h-10 w-10 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} aria-label="Меньше"><Minus size={16} /></button>
              <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
              <button className="grid h-10 w-10 place-items-center disabled:opacity-30" disabled={qty >= max} onClick={() => setQty((q) => q + 1)} aria-label="Больше"><Plus size={16} /></button>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <button
            className="btn-primary btn-lg w-full"
            disabled={out}
            onClick={() => {
              flyToCart(ref.current?.closest("main")?.querySelector(".aspect-square") as HTMLElement, p.image);
              addToCart(item, qty);
            }}
          >
            <ShoppingCart size={18} /> {inCart ? `В корзине: ${inCart.qty} · добавить ещё` : "В корзину"}
          </button>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              className="btn-dark btn-lg w-full"
              disabled={out}
              onClick={() => {
                if (!inCart) addToCart(item, qty);
                router.push("/checkout");
              }}
            >
              <Zap size={18} /> Купить сейчас
            </button>
            <button onClick={() => toggleFavorite(p.id)} className={cn("btn-outline btn-lg w-12 px-0", fav && "border-brand text-brand")} aria-label="В избранное" aria-pressed={fav}>
              <Heart size={20} fill={fav ? "currentColor" : "none"} className={fav ? "animate-pop" : ""} />
            </button>
          </div>
        </div>
      </div>

      {showDelivery && (
        <div className="space-y-3 rounded-card border border-ink-100 p-4 text-sm sm:p-5">
          <div className="flex gap-3"><Truck size={20} className="shrink-0 text-brand" /><div><div className="font-semibold">Доставка</div><div className="text-ink-500">{deliveryText}</div></div></div>
          <div className="flex gap-3"><RotateCcw size={20} className="shrink-0 text-brand" /><div><div className="font-semibold">Возврат 14 дней</div><div className="text-ink-500">Если товар не подошёл</div></div></div>
          <div className="flex gap-3"><ShieldCheck size={20} className="shrink-0 text-brand" /><div><div className="font-semibold">Гарантия производителя</div><div className="text-ink-500">Официальная поставка</div></div></div>
        </div>
      )}

      {showSeller && seller && (
        <Link href={`/shop/${seller.slug}`} className="flex items-center gap-3 rounded-card border border-ink-100 p-4 transition hover:border-brand sm:p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><Store size={20} /></span>
          <div className="flex-1">
            <div className="text-xs text-ink-500">Продавец</div>
            <div className="font-semibold">{seller.shopName}</div>
          </div>
          <div className="text-right text-sm"><div className="font-bold text-brand">★ {seller.rating.toFixed(1)}</div><div className="text-xs text-ink-500">рейтинг</div></div>
        </Link>
      )}
    </div>
  );
}
