"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Eye, Heart, LifeBuoy, LogOut, MapPin, MessageSquareText, Package, Settings, ShieldCheck, Store, User } from "lucide-react";
import { useApp } from "../providers";
import { cn } from "@/lib/utils";

const TITLES: [string, string][] = [
  ["/account/orders/", "Заказ"],
  ["/account/orders", "Мои заказы"],
  ["/account/settings", "Настройки профиля"],
  ["/account/addresses", "Адреса доставки"],
  ["/account/reviews", "Мои отзывы"],
  ["/account/viewed", "Вы смотрели"],
  ["/account/support", "Мои обращения"],
];

/** Desktop: sidebar. Mobile: the profile hub itself is the menu, sub-pages get a back bar. */
export function AccountNav({ seller, admin }: { seller: string | null; admin: boolean }) {
  const path = usePathname();
  const { logout } = useApp();
  const items = [
    { href: "/account", label: "Профиль", icon: User },
    { href: "/account/orders", label: "Мои заказы", icon: Package },
    { href: "/favorites", label: "Избранное", icon: Heart },
    { href: "/account/viewed", label: "Вы смотрели", icon: Eye },
    { href: "/account/reviews", label: "Мои отзывы", icon: MessageSquareText },
    { href: "/account/addresses", label: "Адреса доставки", icon: MapPin },
    { href: "/account/settings", label: "Настройки и безопасность", icon: Settings },
    { href: "/account/support", label: "Поддержка", icon: LifeBuoy },
    seller === "APPROVED" ? { href: "/seller", label: "Кабинет продавца", icon: Store } : { href: "/seller/register", label: seller === "PENDING" ? "Заявка продавца" : "Стать продавцом", icon: Store },
    ...(admin ? [{ href: "/admin", label: "Админ-панель", icon: ShieldCheck }] : []),
  ];
  const title = TITLES.find(([p]) => path.startsWith(p))?.[1];
  const backHref = path.startsWith("/account/orders/") ? "/account/orders" : "/account";
  return (
    <>
      {path !== "/account" && (
        <div className="-mx-4 mb-3 flex items-center gap-1 px-2 lg:hidden">
          <Link href={backHref} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Назад"><ChevronLeft size={22} /></Link>
          <span className="text-lg font-bold">{title ?? "Профиль"}</span>
        </div>
      )}
      <nav className="hidden flex-col gap-1 lg:flex">
        {items.map((i) => {
          const active = i.href === "/account" ? path === "/account" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition", active ? "bg-brand text-white" : "hover:bg-brand-50 hover:text-brand")}>
              <i.icon size={18} />
              {i.label}
            </Link>
          );
        })}
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium hover:bg-ink-100"><LogOut size={18} />Выйти</button>
      </nav>
    </>
  );
}
