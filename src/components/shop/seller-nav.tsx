"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ShoppingBag, Wallet, Plus, Star, Settings, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function SellerNav({ slug, badges }: { slug: string; badges?: { orders?: number; reviews?: number } }) {
  const path = usePathname();
  const items = [
    { href: "/seller", label: "Статистика", icon: BarChart3 },
    { href: "/seller/products", label: "Товары", icon: Package },
    { href: "/seller/orders", label: "Заказы", icon: ShoppingBag, badge: badges?.orders },
    { href: "/seller/reviews", label: "Отзывы", icon: Star, badge: badges?.reviews },
    { href: "/seller/finance", label: "Финансы", icon: Wallet },
    { href: "/seller/settings", label: "Настройки магазина", icon: Settings },
  ];
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => {
        const active = i.href === "/seller" ? path === "/seller" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition", active ? "bg-brand text-white" : "bg-ink-50 hover:bg-brand-50 hover:text-brand")}>
            <i.icon size={17} />
            {i.label}
            {!!i.badge && <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]", active ? "bg-white text-brand" : "bg-brand text-white")}>{i.badge}</span>}
          </Link>
        );
      })}
      <Link href={`/shop/${slug}`} className="flex shrink-0 items-center gap-2 rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm font-semibold hover:text-brand"><Store size={17} />Витрина</Link>
      <Link href="/seller/products/new" className="flex shrink-0 items-center gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-ink-700 sm:ml-auto"><Plus size={17} />Добавить товар</Link>
    </nav>
  );
}
