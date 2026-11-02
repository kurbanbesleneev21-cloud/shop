"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3, Bot, FileText, FolderTree, History, LayoutDashboard, LifeBuoy, Menu, Package, Palette, Send, Settings, ShoppingBag, Star, Store, Tags, Ticket, Users, Wallet, X, ExternalLink, LogOut, Award,
} from "lucide-react";
import { useApp } from "../providers";
import { Logo } from "../shop/logo";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; items: { href: string; label: string; icon: typeof Package; badge?: string }[] }[] = [
  { title: "Обзор", items: [{ href: "/admin", label: "Дашборд", icon: LayoutDashboard }, { href: "/admin/finance", label: "Финансы", icon: Wallet }] },
  { title: "Каталог", items: [
    { href: "/admin/products", label: "Товары", icon: Package },
    { href: "/admin/ai", label: "AI Генератор", icon: Bot },
    { href: "/admin/categories", label: "Категории", icon: FolderTree },
    { href: "/admin/brands", label: "Бренды", icon: Award },
    { href: "/admin/reviews", label: "Отзывы", icon: Star, badge: "reviews" },
  ] },
  { title: "Продажи", items: [
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, badge: "orders" },
    { href: "/admin/sellers", label: "Продавцы", icon: Store, badge: "sellers" },
    { href: "/admin/users", label: "Покупатели", icon: Users },
    { href: "/admin/support", label: "Поддержка", icon: LifeBuoy, badge: "tickets" },
    { href: "/admin/promos", label: "Промокоды и акции", icon: Ticket },
  ] },
  { title: "Сайт", items: [
    { href: "/admin/appearance", label: "Внешний вид", icon: Palette },
    { href: "/admin/pages", label: "Страницы", icon: FileText },
    { href: "/admin/telegram", label: "Telegram", icon: Send },
    { href: "/admin/settings", label: "Глобальные настройки", icon: Settings },
    { href: "/admin/audit", label: "Журнал изменений", icon: History },
  ] },
];

export function AdminSidebar({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { user, logout } = useApp();
  useEffect(() => setOpen(false), [path]);
  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
        <Logo href="/admin" />
        <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Admin</span>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">{g.title}</div>
            {g.items.map((i) => {
              const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
              const b = i.badge ? badges[i.badge] : 0;
              return (
                <Link key={i.href} href={i.href} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "bg-brand text-white shadow-brand" : "text-ink-700 hover:bg-ink-100")}>
                  <i.icon size={18} />
                  <span className="flex-1">{i.label}</span>
                  {b > 0 && <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white text-brand" : "bg-brand text-white")}>{b}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-ink-100 p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-ink-100"><ExternalLink size={18} />Открыть сайт</Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-ink-100"><LogOut size={18} />Выйти · {user?.name.split(" ")[0]}</button>
      </div>
    </nav>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-ink-100 bg-white lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-100 bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-ink-100" aria-label="Меню"><Menu /></button>
        <Logo href="/admin" />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="absolute inset-y-0 left-0 w-[270px] bg-white">
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть"><X /></button>
              {nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="mr-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export { BarChart3 };
