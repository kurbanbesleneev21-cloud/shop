"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ShoppingBag, Wallet, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function SellerNav() {
  const path = usePathname();
  const items = [
    { href: "/seller", label: "Статистика", icon: BarChart3 },
    { href: "/seller/products", label: "Мои товары", icon: Package },
    { href: "/seller/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/seller/finance", label: "Финансы", icon: Wallet },
  ];
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      {items.map((i) => {
        const active = i.href === "/seller" ? path === "/seller" : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition", active ? "bg-brand text-white" : "bg-ink-50 hover:bg-brand-50 hover:text-brand")}><i.icon size={17} />{i.label}</Link>;
      })}
      <Link href="/seller/products/new" className="ml-auto flex shrink-0 items-center gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-ink-700"><Plus size={17} />Добавить товар</Link>
    </nav>
  );
}
