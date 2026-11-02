"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Loader2, MapPin, Package, QrCode, Store, Truck, Lock } from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { ProductImage } from "./product-image";
import { api } from "@/lib/client-api";
import { cn, formatPrice } from "@/lib/utils";

type Priced = { subtotal: number; discount: number; deliveryPrice: number; total: number; promoError?: string; deliveryOptions: { method: string; price: number }[]; lines: { productId: string; available: boolean }[] };

const DELIVERY = { courier: { label: "Курьером", icon: Truck, hint: "Доставка до двери" }, pickup: { label: "Пункт выдачи", icon: Store, hint: "Бесплатное хранение 7 дней" }, post: { label: "Почта России", icon: Package, hint: "В любой населённый пункт" } } as const;
const PAY = { card: { label: "Картой онлайн", icon: CreditCard }, sbp: { label: "СБП", icon: QrCode }, cash: { label: "При получении", icon: Banknote } } as const;

export function CheckoutView() {
  const { cart: rawCart, user, config, clearCart, openAuth, toast } = useApp();
  const hydrated = useHydrated();
  const cart = hydrated ? rawCart : [];
  const router = useRouter();
  const [form, setForm] = useState({ recipientName: "", phone: "", email: "", city: "", address: "", comment: "" });
  const [delivery, setDelivery] = useState<string>("courier");
  const [payment, setPayment] = useState<string>("card");
  const [promo, setPromo] = useState<string>("");
  const [priced, setPriced] = useState<Priced | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

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
    const firstP = (Object.keys(PAY) as (keyof typeof PAY)[]).find((k) => config.payments[k]);
    if (firstP && !config.payments[payment as keyof typeof PAY]) setPayment(firstP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);
  useEffect(() => {
    if (!ready || !cart.length) return;
    api<Priced>("/api/cart/validate", { body: { items: cart.map((c) => ({ productId: c.id, qty: c.qty })), promoCode: promo || undefined, deliveryMethod: delivery } }).then(setPriced).catch(() => undefined);
  }, [cart, promo, delivery, ready]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!user && !config.cart.allowGuestCheckout) return openAuth("login", "/checkout");
    if (delivery !== "pickup" && (!form.city.trim() || !form.address.trim())) return setErr("Укажите город и адрес доставки");
    setBusy(true);
    try {
      const r = await api<{ id: string; number: number; paid: boolean }>("/api/orders", {
        body: { ...form, phone: form.phone.replace(/[^\d+]/g, ""), deliveryMethod: delivery, paymentMethod: payment, promoCode: priced?.promoError ? "" : promo, items: cart.map((c) => ({ productId: c.id, qty: c.qty })) },
      });
      localStorage.setItem("tm_addr", JSON.stringify({ city: form.city, address: form.address }));
      sessionStorage.removeItem("tm_promo");
      clearCart();
      toast(`Заказ №${r.number} оформлен!`);
      router.push(`/checkout/success?n=${r.number}&id=${user ? r.id : ""}&paid=${r.paid ? 1 : 0}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
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
    <form onSubmit={submit} className="container-tm pt-4 sm:pt-6" noValidate>
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
              <div><label className="label">Имя и фамилия</label><input className="input" required value={form.recipientName} onChange={set("recipientName")} autoComplete="name" /></div>
              <div><label className="label">Телефон</label><input className="input" required type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+7 900 000-00-00" /></div>
              <div><label className="label">Email</label><input className="input" required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></div>
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
            {delivery !== "pickup" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
                <div><label className="label">Город</label><input className="input" value={form.city} onChange={set("city")} autoComplete="address-level2" placeholder="Москва" /></div>
                <div><label className="label">Адрес</label><input className="input" value={form.address} onChange={set("address")} autoComplete="street-address" placeholder="Улица, дом, квартира" /></div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm"><MapPin size={16} className="text-brand" /> Пункт выдачи: {form.city || "Москва"}, ближайший к вам — мы пришлём адрес в SMS</div>
            )}
          </Block>
          <Block n={3} title="Способ оплаты">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PAY) as (keyof typeof PAY)[]).filter((k) => config.payments[k]).map((k) => {
                const P = PAY[k];
                return (
                  <button type="button" key={k} onClick={() => setPayment(k)} className={cn("flex flex-col items-center gap-1.5 rounded-card border-2 p-3 text-center text-sm font-semibold transition", payment === k ? "border-brand bg-brand-50 text-brand" : "border-ink-100 hover:border-ink-300")}>
                    <P.icon size={22} />
                    {P.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3"><label className="label">Комментарий к заказу</label><textarea className="textarea min-h-[70px]" value={form.comment} onChange={set("comment")} maxLength={1000} placeholder="Например, позвонить за час до доставки" /></div>
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
            {err && <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm font-medium">{err}</div>}
            <button className="btn-primary btn-lg mt-4 w-full" disabled={busy || !priced}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              {payment === "cash" ? "Оформить заказ" : "Оплатить заказ"}
            </button>
            <p className="mt-3 text-center text-xs text-ink-500">Нажимая кнопку, вы соглашаетесь с условиями <Link href="/info/privacy" className="link">обработки данных</Link></p>
          </div>
        </aside>
      </div>
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
