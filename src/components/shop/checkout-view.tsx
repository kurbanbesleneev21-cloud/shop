"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { SavedAddress } from "./address-book";
import { Loader2, MapPin, Package, Store, Truck, Lock, ShieldCheck } from "lucide-react";
import { PaymentPicker } from "./payment-picker";
import { methodDef } from "@/lib/payment-methods";
import { useApp, useHydrated } from "../providers";
import { ProductImage } from "./product-image";
import { api } from "@/lib/client-api";
import { cn, formatPrice } from "@/lib/utils";

type Priced = { subtotal: number; discount: number; deliveryPrice: number; total: number; promoError?: string; deliveryOptions: { method: string; price: number }[]; lines: { productId: string; available: boolean }[] };

const DELIVERY = { courier: { label: "Курьером", icon: Truck, hint: "Доставка до двери" }, pickup: { label: "Пункт выдачи", icon: Store, hint: "Бесплатное хранение 7 дней" }, post: { label: "Почта России", icon: Package, hint: "В любой населённый пункт" } } as const;

export function CheckoutView() {
  const { cart: rawCart, user, config, clearCart, openAuth, toast } = useApp();
  const hydrated = useHydrated();
  const cart = hydrated ? rawCart : [];
  const router = useRouter();
  const [form, setForm] = useState({ recipientName: "", phone: "", email: "", city: "", address: "", comment: "", companyName: "", companyInn: "" });
  const [delivery, setDelivery] = useState<string>("courier");
  const [payment, setPayment] = useState<string>("platega_sbp");
  const [promo, setPromo] = useState<string>("");
  const [priced, setPriced] = useState<Priced | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [priceErr, setPriceErr] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ items: SavedAddress[] }>("/api/account/addresses")
      .then((d) => {
        setSaved(d.items);
        const def = d.items.find((a) => a.isDefault);
        if (def) setForm((f) => (f.city || f.address ? f : { ...f, city: def.city, address: def.line }));
      })
      .catch(() => undefined);
  }, [user]);
  useEffect(() => {
    setForm((f) => ({ ...f, recipientName: f.recipientName || user?.name || "", phone: f.phone || user?.phone || "", email: f.email || user?.email || "" }));
  }, [user]);
  useEffect(() => {
    try {
      const p = JSON.parse(sessionStorage.getItem("tm_promo") || "null");
      if (p?.code) setPromo(p.code);
      const addr = JSON.parse(localStorage.getItem("tm_addr") || "null");
      if (addr) setForm((f) => ({ ...f, city: addr.city || "", address: addr.address || "" }));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    const firstD = (Object.keys(DELIVERY) as (keyof typeof DELIVERY)[]).find((k) => config.delivery[k]);
    if (firstD && !config.delivery[delivery as keyof typeof DELIVERY]) setDelivery(firstD);
    if (!config.payments.enabled.includes(payment) && config.payments.enabled[0]) setPayment(config.payments.enabled[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);
  useEffect(() => {
    if (!ready || !cart.length) return;
    let stale = false;
    setPriced(null); // the pay button stays disabled until the new total is known
    setPriceErr("");
    api<Priced>("/api/cart/validate", { body: { items: cart.map((c) => ({ productId: c.id, qty: c.qty })), promoCode: promo || undefined, deliveryMethod: delivery } })
      .then((r) => !stale && setPriced(r))
      .catch((e) => !stale && setPriceErr((e as Error).message || "Не удалось рассчитать стоимость"));
    return () => {
      stale = true;
    };
  }, [cart, promo, delivery, ready, retry]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!user && !config.cart.allowGuestCheckout) return openAuth("login", "/checkout");
    if (delivery !== "pickup" && (!form.city.trim() || !form.address.trim())) {
      setErr("Укажите город и адрес доставки");
      toast("Укажите город и адрес доставки", "error");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ id: string; number: number; redirectUrl: string | null; online: boolean; paymentError?: string }>("/api/orders", {
        body: { ...form, phone: form.phone.replace(/[^\d+]/g, ""), deliveryMethod: delivery, paymentMethod: payment, promoCode: priced?.promoError ? "" : promo, items: cart.map((c) => ({ productId: c.id, qty: c.qty })) },
      });
      localStorage.setItem("tm_addr", JSON.stringify({ city: form.city, address: form.address }));
      sessionStorage.removeItem("tm_promo");
      clearCart();
      toast(`Заказ №${r.number} оформлен!`);
      if (r.redirectUrl && /^https:\/\//.test(r.redirectUrl)) {
        window.location.assign(r.redirectUrl); // provider payment page (ЮKassa / Т-Банк)
        return;
      }
      if (r.redirectUrl) router.push(r.redirectUrl); // Kaspi page or test acquiring
      else router.push(`/checkout/success?n=${r.number}&id=${user ? r.id : ""}${r.paymentError ? "&perr=1" : ""}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (ready && !cart.length) {
    return (
      <div className="container-tm py-16 text-center">
        <h1 className="text-2xl font-extrabold">Корзина пуста</h1>
        <Link href="/catalog" className="btn-primary mt-6">В каталог</Link>
      </div>
    );
  }

  const deliveryPrice = (m: string) => priced?.deliveryOptions.find((o) => o.method === m)?.price;

  return (
    <form id="checkout-form" onSubmit={submit} className="container-tm pb-24 pt-4 sm:pt-6 md:pb-0" noValidate>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Оформление заказа</h1>
      {!user && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-brand-50 p-4 text-sm">
          <span className="flex-1">Войдите, чтобы отслеживать заказ в личном кабинете и оставлять отзывы.</span>
          <button type="button" onClick={() => openAuth("login", "/checkout")} className="btn-primary btn-sm">Войти</button>
          {config.cart.allowGuestCheckout && <span className="text-ink-500">или продолжите как гость</span>}
        </div>
      )}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Block n={1} title="Получатель">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block"><span className="label">Имя и фамилия</span><input className="input" required value={form.recipientName} onChange={set("recipientName")} autoComplete="name" /></label>
              <label className="block"><span className="label">Телефон</span><input className="input" required type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+7 900 000-00-00" /></label>
              <label className="block"><span className="label">Email</span><input className="input" required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
            </div>
          </Block>
          <Block n={2} title="Способ доставки">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(DELIVERY) as (keyof typeof DELIVERY)[]).filter((k) => config.delivery[k]).map((k) => {
                const D = DELIVERY[k];
                const price = deliveryPrice(k);
                return (
                  <button type="button" key={k} onClick={() => setDelivery(k)} className={cn("rounded-card border-2 p-3.5 text-left transition", delivery === k ? "border-brand bg-brand-50" : "border-ink-100 hover:border-ink-300")}>
                    <D.icon size={22} className={delivery === k ? "text-brand" : "text-ink-500"} />
                    <div className="mt-2 font-semibold">{D.label}</div>
                    <div className="text-xs text-ink-500">{D.hint} · {config.delivery.deliveryDays}</div>
                    <div className="mt-1 text-sm font-bold">{price === undefined ? "…" : price === 0 ? "Бесплатно" : formatPrice(price, config.currency)}</div>
                  </button>
                );
              })}
            </div>
            {delivery !== "pickup" && saved.length > 0 && (
              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
                {saved.map((a) => {
                  const on = form.city === a.city && form.address === a.line;
                  return (
                    <button type="button" key={a.id} onClick={() => setForm((f) => ({ ...f, city: a.city, address: a.line }))} className={cn("flex max-w-[260px] shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm", on ? "border-brand bg-brand-50" : "border-ink-100")}>
                      <MapPin size={16} className="shrink-0 text-brand" /><span className="truncate">{a.city}, {a.line}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {delivery !== "pickup" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
                <label className="block"><span className="label">Город</span><input className="input" value={form.city} onChange={set("city")} autoComplete="address-level2" placeholder="Москва" /></label>
                <label className="block"><span className="label">Адрес</span><input className="input" value={form.address} onChange={set("address")} autoComplete="street-address" placeholder="Улица, дом, квартира" /></label>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm"><MapPin size={16} className="text-brand" /> Пункт выдачи: {form.city || "Москва"}, ближайший к вам — мы пришлём адрес в SMS</div>
            )}
          </Block>
          <Block n={3} title="Способ оплаты">
            <PaymentPicker value={payment} onChange={setPayment} total={priced?.total ?? 0} cfg={config.payments} currency={config.currency} />
            {config.payments.testMode && methodDef(payment)?.online && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand"><ShieldCheck size={16} />Платёжная система работает в тестовом режиме: деньги не списываются.</p>
            )}
            <label className="mt-3 block"><span className="label">Комментарий к заказу</span><textarea className="textarea min-h-[70px]" value={form.comment} onChange={set("comment")} maxLength={1000} placeholder="Например, позвонить за час до доставки" /></label>
          </Block>
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-card border border-ink-100 p-5 shadow-card">
            <div className="flex -space-x-3 overflow-hidden">
              {cart.slice(0, 6).map((c) => (
                <span key={c.id} className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-ink-50"><ProductImage src={c.image} alt="" sizes="56px" /></span>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-[15px]">
              <div className="flex justify-between"><span className="text-ink-500">Товары</span><span>{formatPrice(priced?.subtotal ?? 0, config.currency)}</span></div>
              {!!priced?.discount && <div className="flex justify-between"><span className="text-ink-500">Промокод {promo}</span><span className="font-semibold text-brand">−{formatPrice(priced.discount, config.currency)}</span></div>}
              {priced?.promoError && promo && <div className="text-xs text-ink-500">Промокод {promo}: {priced.promoError}</div>}
              <div className="flex justify-between"><span className="text-ink-500">Доставка</span><span>{priced ? (priced.deliveryPrice ? formatPrice(priced.deliveryPrice, config.currency) : "Бесплатно") : "…"}</span></div>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-100 pt-4">
              <span className="text-lg font-bold">К оплате</span>
              <span className="text-2xl font-extrabold">{formatPrice(priced?.total ?? 0, config.currency)}</span>
            </div>
            {priceErr && <div role="alert" className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm font-medium">Не удалось рассчитать стоимость: {priceErr}. <button type="button" className="link" onClick={() => setRetry((n) => n + 1)}>Повторить</button></div>}
            {err && <div role="alert" className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm font-medium">{err}</div>}
            <button className="btn-primary btn-lg mt-4 w-full" disabled={busy || !priced}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              Перейти к оплате
            </button>
            <p className="mt-3 text-center text-xs text-ink-500">Нажимая кнопку, вы соглашаетесь с условиями <Link href="/info/privacy" className="link">обработки данных</Link></p>
          </div>
        </aside>
      </div>
      {hydrated && createPortal(
        <div className="fixed inset-x-0 bottom-[60px] z-40 border-t border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-ink-500">К оплате</div>
              <div className="text-lg font-extrabold leading-tight">{formatPrice(priced?.total ?? 0, config.currency)}</div>
            </div>
            <button form="checkout-form" className="btn-primary ml-auto h-12 flex-1" disabled={busy || !priced}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}Оплатить
            </button>
          </div>
        </div>,
        document.body,
      )}
    </form>
  );
}

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-ink-100 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">{n}</span>{title}</h2>
      {children}
    </section>
  );
}
