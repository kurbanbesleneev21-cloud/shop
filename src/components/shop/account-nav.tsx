"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LifeBuoy, LogOut, Package, Store, User } from "lucide-react";
import { useApp } from "../providers";
import { cn } from "@/lib/utils";

export function AccountNav({ seller }: { seller: string | null }) {
  const path = usePathname();
  const { logout } = useApp();
  const items = [
    { href: "/account", label: "Профиль", icon: User },
    { href: "/account/orders", label: "Мои заказы", icon: Package },
    { href: "/favorites", label: "Избранное", icon: Heart },
    { href: "/account/support", label: "Поддержка", icon: LifeBuoy },
    seller === "APPROVED" ? { href: "/seller", label: "Кабинет продавца", icon: Store } : { href: "/seller/register", label: seller === "PENDING" ? "Заявка продавца" : "Стать продавцом", icon: Store },
  ];
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
      {items.map((i) => {
        const active = i.href === "/account" ? path === "/account" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition", active ? "bg-brand text-white" : "bg-ink-50 hover:bg-brand-50 hover:text-brand lg:bg-transparent")}>
            <i.icon size={18} />
            {i.label}
          </Link>
        );
      })}
      <button onClick={logout} className="flex shrink-0 items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm font-medium hover:bg-ink-100 lg:bg-transparent"><LogOut size={18} />Выйти</button>
    </nav>
  );
}
