"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgePercent, ChevronRight, CreditCard, Eye, FileText, Heart, LifeBuoy, LogOut, MailWarning, MapPin, MessageSquareText,
  Package, PackageCheck, RotateCcw, Settings, ShieldCheck, Store, Truck, Wallet, Star,
} from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { cn, formatPrice } from "@/lib/utils";

type Counts = { unpaid: number; active: number; done: number; returns: number; addresses: number; reviews: number; awaiting: number; tickets: number; spent: number };
type HubUser = { name: string; email: string; phone: string; emailVerified: boolean; admin: boolean; seller: string | null };

export function ProfileHub({ user, counts, pages }: { user: HubUser; counts: Counts; pages: { slug: string; title: string }[] }) {
  const { favorites, logout, config } = useApp();
  const hydrated = useHydrated();
  const [viewed, setViewed] = useState(0);
  useEffect(() => {
    try {
      setViewed((JSON.parse(localStorage.getItem("tm_recent") || "[]") as string[]).length);
    } catch {}
  }, []);
  const favCount = hydrated ? favorites.size : 0;

  const statuses = [
    { href: "/account/orders?tab=unpaid", label: "Ожидают оплаты", icon: Wallet, n: counts.unpaid },
    { href: "/account/orders?tab=active", label: "В пути", icon: Truck, n: counts.active },
    { href: "/account/orders?tab=done", label: "Получены", icon: PackageCheck, n: counts.done },
    { href: "/account/orders?tab=returns", label: "Возвраты", icon: RotateCcw, n: counts.returns },
  ];
  const tiles = [
    { href: "/favorites", label: "Избранное", icon: Heart, sub: favCount ? `${favCount} шт.` : "Пусто" },
    { href: "/account/viewed", label: "Вы смотрели", icon: Eye, sub: viewed ? `${viewed} шт.` : "Пусто" },
    { href: "/account/reviews", label: "Отзывы", icon: Star, sub: counts.awaiting ? `Ждут: ${counts.awaiting}` : counts.reviews ? `${counts.reviews} шт.` : "Оценить покупки" },
    { href: "/account/addresses", label: "Адреса", icon: MapPin, sub: counts.addresses ? `${counts.addresses} шт.` : "Добавить" },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Profile card */}
      <Link href="/account/settings" className="flex items-center gap-4 rounded-card bg-ink p-4 text-white transition hover:bg-ink-700 sm:p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-bold">{user.name[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{user.name}</div>
          <div className="truncate text-sm text-white/70">{user.phone || user.email}</div>
        </div>
        <span className="flex items-center gap-1 text-sm text-white/70"><Settings size={18} /><span className="hidden xs:inline">Настройки</span></span>
      </Link>

      {!user.emailVerified && (
        <Link href="/account/settings" className="flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-3.5 text-sm">
          <MailWarning size={20} className="shrink-0 text-brand" />
          <span className="flex-1"><b>Подтвердите email</b> — так мы сможем присылать чеки и статусы заказов</span>
          <ChevronRight size={18} className="text-brand" />
        </Link>
      )}

      {/* Orders */}
      <section className="rounded-card border border-ink-100 p-4 sm:p-5">
        <Link href="/account/orders" className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Мои заказы</h2>
          <span className="flex items-center text-sm font-semibold text-brand">Все<ChevronRight size={18} /></span>
        </Link>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {statuses.map((s) => (
            <Link key={s.href} href={s.href} className="relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition hover:bg-brand-50">
              <span className="relative grid h-11 w-11 place-items-center rounded-full bg-ink-50 text-ink">
                <s.icon size={22} />
                {s.n > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{s.n}</span>}
              </span>
              <span className="text-[11px] font-medium leading-tight sm:text-xs">{s.label}</span>
            </Link>
          ))}
        </div>
        {counts.spent > 0 && <div className="mt-3 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-600">Покупок на сумму <b className="text-ink">{formatPrice(counts.spent, config.currency)}</b></div>}
      </section>

      {/* Quick tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="flex flex-col gap-2 rounded-card bg-ink-50 p-3.5 transition hover:bg-brand-50">
            <t.icon size={22} className="text-brand" />
            <div>
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-ink-500">{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {counts.awaiting > 0 && (
        <Link href="/account/reviews" className="flex items-center gap-3 rounded-card bg-brand p-4 text-white">
          <MessageSquareText size={24} />
          <div className="flex-1"><div className="font-bold">Оцените покупки</div><div className="text-sm text-white/80">{counts.awaiting} {counts.awaiting === 1 ? "товар ждёт" : "товара ждут"} вашего отзыва</div></div>
          <ChevronRight />
        </Link>
      )}

      <Group title="Покупки">
        <Row href="/account/orders" icon={Package}>Все заказы</Row>
        <Row href="/account/orders?tab=returns" icon={RotateCcw}>Возвраты</Row>
        <Row href="/cart" icon={CreditCard}>Корзина</Row>
        <Row href="/catalog?discount=1" icon={BadgePercent}>Скидки и акции</Row>
      </Group>

      <Group title="Сервисы">
        {user.seller === "APPROVED" ? (
          <Row href="/seller" icon={Store} accent>Кабинет продавца</Row>
        ) : (
          <Row href="/seller/register" icon={Store} accent hint={user.seller === "PENDING" ? "Заявка на проверке" : "Продавайте на VITRINA"}>{user.seller === "PENDING" ? "Заявка продавца" : "Стать продавцом"}</Row>
        )}
        {user.admin && <Row href="/admin" icon={ShieldCheck} accent>Админ-панель</Row>}
        <Row href="/account/support" icon={LifeBuoy} hint={counts.tickets ? `Обращений: ${counts.tickets}` : "Чат с поддержкой"}>Поддержка</Row>
      </Group>

      <Group title="Настройки">
        <Row href="/account/settings" icon={Settings} hint="Имя, телефон, email, пароль">Профиль и безопасность</Row>
        <Row href="/account/addresses" icon={MapPin}>Адреса доставки</Row>
      </Group>

      {pages.length > 0 && (
        <Group title="Информация">
          {pages.map((p) => <Row key={p.slug} href={`/info/${p.slug}`} icon={FileText}>{p.title}</Row>)}
        </Group>
      )}

      <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-card border border-ink-100 py-3.5 font-semibold text-ink-600 transition hover:bg-ink-50 lg:hidden">
        <LogOut size={18} />Выйти из аккаунта
      </button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100">{children}</div>
    </section>
  );
}

function Row({ href, icon: Icon, children, hint, accent }: { href: string; icon: typeof Package; children: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-brand-50">
      <Icon size={20} className={cn("shrink-0", accent ? "text-brand" : "text-ink-500")} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{children}</span>
        {hint && <span className="block truncate text-xs text-ink-500">{hint}</span>}
      </span>
      <ChevronRight size={18} className="text-ink-300" />
    </Link>
  );
}
