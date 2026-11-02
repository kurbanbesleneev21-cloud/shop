"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Minus, Plus, ShoppingBag, Trash2, Tag, Loader2, Check } from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { ProductImage } from "./product-image";
import { RecentlyViewed } from "./recent";
import { api } from "@/lib/client-api";
import { formatPrice, plural } from "@/lib/utils";

type Validated = { lines: { productId: string; price: number; oldPrice: number | null; stock: number; available: boolean; title: string }[] };

export function useValidatedCart() {
  const { cart } = useApp();
  const [data, setData] = useState<Validated | null>(null);
  const key = cart.map((c) => c.id + ":" + c.qty).join("|");
  useEffect(() => {
    if (!cart.length) return setData({ lines: [] });
    const t = setTimeout(() => {
      api<Validated>("/api/cart/validate", { body: { items: cart.map((c) => ({ productId: c.id, qty: c.qty })) } }).then(setData).catch(() => undefined);
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}

export function CartView() {
  const { cart: rawCart, setQty, removeFromCart, clearCart, favorites, toggleFavorite, config, syncCart } = useApp();
  const hydrated = useHydrated();
  const cart = hydrated ? rawCart : [];
  const v = useValidatedCart();
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const [busy, setBusy] = useState(false);

  // sync fresh prices/stock from the server into the local cart
  useEffect(() => {
    if (v) syncCart(v.lines);
  }, [v, syncCart]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("tm_promo");
      if (saved) setApplied(JSON.parse(saved));
    } catch {}
  }, []);

  const unavailable = new Set(v?.lines.filter((l) => !l.available).map((l) => l.productId));
  const items = cart;
  const active = items.filter((i) => !unavailable.has(i.id));
  const subtotal = active.reduce((s, i) => s + i.price * i.qty, 0);
  const oldTotal = active.reduce((s, i) => s + Math.max(i.oldPrice ?? i.price, i.price) * i.qty, 0);
  const count = active.reduce((s, i) => s + i.qty, 0);
  const discount = applied?.discount ?? 0;
  const freeFrom = config.delivery.freeFrom;

  async function applyPromo() {
    setPromoErr("");
    setBusy(true);
    try {
      const r = await api<{ discount: number; code: string }>("/api/promo", { body: { code: promo, items: active.map((i) => ({ productId: i.id, qty: i.qty })) } });
      setApplied(r);
      sessionStorage.setItem("tm_promo", JSON.stringify(r));
    } catch (e) {
      setPromoErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="container-tm pt-6"><div className="skeleton h-9 w-48" /><div className="mt-5 grid gap-6 lg:grid-cols-[1fr_380px]"><div className="skeleton h-64" /><div className="skeleton h-64" /></div></div>;
  if (!items.length) {
    return (
      <div className="container-tm pt-10">
        <div className="mx-auto max-w-md animate-fade-up text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand"><ShoppingBag size={36} /></div>
          <h1 className="mt-5 text-2xl font-extrabold">Корзина пуста</h1>
          <p className="mt-2 text-ink-500">Загляните в каталог — там тысячи товаров с быстрой доставкой.</p>
          <Link href="/catalog" className="btn-primary btn-lg mt-6">Перейти в каталог</Link>
        </div>
        <RecentlyViewed />
      </div>
    );
  }

  return (
    <div className="container-tm pt-4 sm:pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Корзина <span className="text-lg font-semibold text-ink-400">{count}</span></h1>
        <button onClick={() => confirm("Очистить корзину?") && clearCart()} className="text-sm font-medium text-ink-500 hover:text-brand">Очистить</button>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {subtotal < freeFrom && freeFrom > 0 && (
            <div className="rounded-card bg-brand-50 p-4">
              <div className="text-sm font-medium">До бесплатной доставки осталось <b className="text-brand">{formatPrice(freeFrom - subtotal, config.currency)}</b></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / freeFrom) * 100)}%` }} /></div>
            </div>
          )}
          <ul className="divide-y divide-ink-100 rounded-card border border-ink-100">
            <AnimatePresence initial={false}>
              {items.map((i) => {
                const na = unavailable.has(i.id);
                return (
                  <motion.li key={i.id} layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="flex gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
                    <Link href={`/product/${i.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-50 sm:h-28 sm:w-28"><ProductImage src={i.image} alt={i.title} sizes="112px" /></Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <Link href={`/product/${i.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand sm:text-[15px]">{i.title}</Link>
                        <div className="shrink-0 sm:text-right">
                          <div className="text-lg font-extrabold">{formatPrice(i.price * i.qty, config.currency)}</div>
                          {i.oldPrice && i.oldPrice > i.price && <div className="text-xs text-ink-400 line-through">{formatPrice(i.oldPrice * i.qty, config.currency)}</div>}
                        </div>
                      </div>
                      {na ? <div className="mt-1 text-sm font-semibold text-ink-500">Товар закончился</div> : i.stock <= 5 && <div className="mt-1 text-xs font-medium text-brand">Осталось {i.stock} шт.</div>}
                      <div className="mt-auto flex items-center gap-1 pt-2">
                        <div className="flex h-9 items-center rounded-btn bg-ink-100">
                          <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={i.qty <= 1 || na} onClick={() => setQty(i.id, i.qty - 1)} aria-label="Меньше"><Minus size={15} /></button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                          <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={na || i.qty >= Math.min(i.stock, config.cart.maxQtyPerItem)} onClick={() => setQty(i.id, i.qty + 1)} aria-label="Больше"><Plus size={15} /></button>
                        </div>
                        <button onClick={() => toggleFavorite(i.id)} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-brand" aria-label="В избранное"><Heart size={18} fill={favorites.has(i.id) ? "currentColor" : "none"} className={favorites.has(i.id) ? "text-brand" : ""} /></button>
                        <button onClick={() => removeFromCart(i.id)} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink" aria-label="Удалить"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-card border border-ink-100 p-5 shadow-card">
            <div className="space-y-2.5 text-[15px]">
              <div className="flex justify-between"><span className="text-ink-500">Товары ({count})</span><span>{formatPrice(oldTotal, config.currency)}</span></div>
              {oldTotal > subtotal && <div className="flex justify-between"><span className="text-ink-500">Скидка на товары</span><span className="font-semibold text-brand">−{formatPrice(oldTotal - subtotal, config.currency)}</span></div>}
              {discount > 0 && <div className="flex justify-between"><span className="text-ink-500">Промокод {applied?.code}</span><span className="font-semibold text-brand">−{formatPrice(discount, config.currency)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-500">Доставка</span><span>{subtotal >= freeFrom ? "бесплатно" : "при оформлении"}</span></div>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-100 pt-4">
              <span className="text-lg font-bold">Итого</span>
              <span className="text-2xl font-extrabold">{formatPrice(Math.max(0, subtotal - discount), config.currency)}</span>
            </div>
            {config.cart.promoEnabled && (
              <div className="mt-4">
                {applied ? (
                  <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-brand"><Check size={16} /> {applied.code} применён</span>
                    <button onClick={() => { setApplied(null); sessionStorage.removeItem("tm_promo"); }} className="text-ink-500 hover:text-ink">Убрать</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="Промокод" className="input h-10 pl-9 text-sm uppercase" />
                    </div>
                    <button onClick={applyPromo} disabled={!promo || busy} className="btn-outline h-10 text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : "Применить"}</button>
                  </div>
                )}
                {promoErr && <p className="mt-1.5 text-xs font-medium">{promoErr}</p>}
              </div>
            )}
            {subtotal < config.cart.minOrder && <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm">Минимальная сумма заказа — {formatPrice(config.cart.minOrder, config.currency)}</p>}
            <Link href="/checkout" aria-disabled={!active.length || subtotal < config.cart.minOrder} className={`btn-primary btn-lg mt-4 w-full ${!active.length || subtotal < config.cart.minOrder ? "pointer-events-none opacity-50" : ""}`}>
              Перейти к оформлению
            </Link>
            <p className="mt-3 text-center text-xs text-ink-500">{count} {plural(count, ["товар", "товара", "товаров"])} · способы доставки и оплаты на следующем шаге</p>
          </div>
        </aside>
      </div>
      {/* sticky mobile checkout bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-40 border-t border-ink-100 bg-white p-3 lg:hidden">
        <Link href="/checkout" className="btn-primary h-12 w-full justify-between px-5"><span>К оформлению</span><span>{formatPrice(Math.max(0, subtotal - discount), config.currency)}</span></Link>
      </div>
      <div className="h-20 lg:hidden" />
    </div>
  );
}
