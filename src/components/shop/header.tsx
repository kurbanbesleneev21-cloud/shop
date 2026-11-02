"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Heart, LayoutGrid, LogOut, Package, Search, ShieldCheck, ShoppingCart, Store, User, X, Home, Loader2 } from "lucide-react";
import { useApp, useHydrated } from "../providers";
import { Logo } from "./logo";
import { CategoryIcon } from "./category-icon";
import { ProductImage } from "./product-image";
import { cn, formatPrice } from "@/lib/utils";

export type NavCategory = { id: string; name: string; slug: string; icon: string | null; children: { id: string; name: string; slug: string }[] };
type Suggest = { products: { id: string; title: string; slug: string; price: number; image: string | null }[]; categories: { name: string; slug: string }[] };

export function Header({ categories, links, topBar }: { categories: NavCategory[]; links: { label: string; href: string }[]; topBar?: { text: string; link: string } | null }) {
  const { user, cartCount: rawCount, favorites, openAuth, cartPulse, config, logout } = useApp();
  const hydrated = useHydrated();
  const cartCount = hydrated ? rawCount : 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [menuTop, setMenuTop] = useState(0);
  const openMenu = (v: boolean) => {
    if (v && headerRef.current) setMenuTop(Math.max(0, headerRef.current.getBoundingClientRect().bottom));
    setMenuOpen(v);
  };
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const dark = config.headerStyle === "dark";

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  return (
    <>
      {topBar && (
        <Link href={topBar.link || "#"} className="block bg-ink py-2 text-center text-xs font-medium text-white transition hover:bg-ink-700 sm:text-sm">
          {topBar.text} <ChevronRight size={14} className="inline -mt-0.5" />
        </Link>
      )}
      <header ref={headerRef} className={cn("sticky top-0 z-50 border-b", dark ? "border-ink-700 bg-ink text-white" : "border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85")}>
        <div className="container-tm flex flex-wrap items-center gap-x-2 gap-y-2 py-2.5 sm:gap-x-4 md:h-[72px] md:flex-nowrap md:py-0">
          <Logo dark={dark} />
          <button onClick={() => openMenu(!menuOpen)} className={cn("btn hidden h-11 shrink-0 md:inline-flex", menuOpen ? "bg-brand-600 text-white" : "bg-brand text-white hover:bg-brand-600")} aria-expanded={menuOpen}>
            <span className="relative h-4 w-4">
              <span className={cn("absolute left-0 top-0.5 h-0.5 w-4 rounded bg-white transition", menuOpen && "top-[7px] rotate-45")} />
              <span className={cn("absolute left-0 top-[7px] h-0.5 w-4 rounded bg-white transition", menuOpen && "opacity-0")} />
              <span className={cn("absolute left-0 top-[13px] h-0.5 w-4 rounded bg-white transition", menuOpen && "top-[7px] -rotate-45")} />
            </span>
            Каталог
          </button>
          <SearchBox dark={dark} />
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="btn-dark btn-sm ml-auto shrink-0 md:hidden"><ShieldCheck size={16} />Админка</Link>
          )}
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {user?.role === "ADMIN" && (
              <Link href="/admin" className={cn("flex h-14 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold text-brand transition", dark ? "hover:bg-white/10" : "hover:bg-brand-50")}>
                <ShieldCheck size={22} />
                <span>Админка</span>
              </Link>
            )}
            <IconLink href="/favorites" label="Избранное" count={favorites.size} dark={dark}><Heart size={22} /></IconLink>
            <IconLink href="/cart" label="Корзина" count={cartCount} pulse={cartPulse} dark={dark} cartTarget><ShoppingCart size={22} /></IconLink>
            <div className="relative">
              <button
                onClick={() => (user ? setProfileOpen((v) => !v) : openAuth("login"))}
                className={cn("flex h-14 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition", dark ? "hover:bg-white/10" : "hover:bg-ink-100")}
              >
                <User size={22} />
                <span className="max-w-[80px] truncate">{user ? user.name.split(" ")[0] : "Войти"}</span>
              </button>
              <AnimatePresence>
                {profileOpen && user && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-ink-100 bg-white p-2 text-ink shadow-lift">
                      <div className="px-3 py-2">
                        <div className="font-semibold">{user.name}</div>
                        <div className="truncate text-xs text-ink-500">{user.email}</div>
                      </div>
                      <MenuLink href="/account" icon={<User size={18} />}>Личный кабинет</MenuLink>
                      <MenuLink href="/account/orders" icon={<Package size={18} />}>Мои заказы</MenuLink>
                      <MenuLink href="/favorites" icon={<Heart size={18} />}>Избранное</MenuLink>
                      {user.seller?.status === "APPROVED" ? <MenuLink href="/seller" icon={<Store size={18} />}>Кабинет продавца</MenuLink> : <MenuLink href="/seller/register" icon={<Store size={18} />}>Стать продавцом</MenuLink>}
                      {user.role === "ADMIN" && <MenuLink href="/admin" icon={<ShieldCheck size={18} />}>Админ-панель</MenuLink>}
                      <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-ink-100"><LogOut size={18} />Выйти</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
        <div className={cn("hidden border-t md:block", dark ? "border-ink-700" : "border-ink-100")}>
          <div className="container-tm flex h-10 items-center gap-6 overflow-x-auto text-sm scrollbar-none">
            {links.map((l) => (
              <Link key={l.href + l.label} href={l.href} className={cn("whitespace-nowrap font-medium transition hover:text-brand", dark ? "text-white/80" : "text-ink-600")}>{l.label}</Link>
            ))}
          </div>
        </div>
        
      </header>
      <MegaMenuPortal open={menuOpen} top={menuTop} categories={categories} onClose={() => setMenuOpen(false)} />
      <MobileNav onCatalog={() => openMenu(true)} />
    </>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-brand-50 hover:text-brand">
      {icon}
      {children}
    </Link>
  );
}

function IconLink({ href, label, count, children, pulse, dark, cartTarget }: { href: string; label: string; count: number; children: React.ReactNode; pulse?: number; dark?: boolean; cartTarget?: boolean }) {
  return (
    <Link href={href} className={cn("relative flex h-14 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition", dark ? "hover:bg-white/10" : "hover:bg-ink-100")} {...(cartTarget ? { "data-cart-target": "" } : {})}>
      <span key={pulse} className={pulse ? "animate-pop" : ""}>{children}</span>
      <span>{label}</span>
      {count > 0 && <span key={"c" + count} className="absolute right-2 top-1.5 grid h-[18px] min-w-[18px] animate-pop place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

function SearchBox({ dark }: { dark: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { config } = useApp();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setData(null);
      return;
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.current.signal });
        if (r.ok) setData(await r.json());
      } catch {}
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    if (q.trim()) router.push(`/catalog?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="relative order-last w-full min-w-0 md:order-none md:w-auto md:flex-1" role="search">
      <div className={cn("flex h-11 items-center rounded-btn border-2 transition focus-within:border-brand", dark ? "border-white/20 bg-white" : "border-brand bg-white")}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Искать на TECHMARKET"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink-400"
          aria-label="Поиск товаров"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="grid h-9 w-9 place-items-center text-ink-400 hover:text-ink" aria-label="Очистить">
            <X size={16} />
          </button>
        )}
        <button className="mr-0.5 grid h-9 w-11 place-items-center rounded-[calc(var(--radius)*.55)] bg-brand text-white hover:bg-brand-600" aria-label="Найти">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>
      <AnimatePresence>
        {open && data && (data.products.length > 0 || data.categories.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ink-100 bg-white text-ink shadow-lift">
            {data.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-ink-100 p-3">
                {data.categories.map((c) => (
                  <Link key={c.slug} href={`/catalog/${c.slug}`} className="chip h-8 text-xs">{c.name}</Link>
                ))}
              </div>
            )}
            {data.products.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-brand-50">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-50"><ProductImage src={p.image} alt="" sizes="44px" /></span>
                <span className="line-clamp-1 flex-1 text-sm">{p.title}</span>
                <span className="text-sm font-bold">{formatPrice(p.price, config.currency)}</span>
              </Link>
            ))}
            <button className="w-full border-t border-ink-100 px-3 py-2.5 text-left text-sm font-semibold text-brand hover:bg-brand-50">Все результаты по запросу «{q}»</button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

// Rendered into <body> via a portal: the sticky header uses backdrop-filter, which would otherwise
// become the containing block for position:fixed children and clip the menu.
function MegaMenuPortal({ open, top, categories, onClose }: { open: boolean; top: number; categories: NavCategory[]; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{open && <MegaMenu categories={categories} onClose={onClose} top={top} />}</AnimatePresence>, document.body);
}

function MegaMenu({ categories, onClose, top }: { categories: NavCategory[]; onClose: () => void; top: number }) {
  const [active, setActive] = useState(categories[0]?.id);
  const current = categories.find((c) => c.id === active);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] bg-ink/40" style={{ top }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{ ["--menu-top" as string]: `${top}px` }}
        className="fixed inset-0 z-[60] overflow-y-auto bg-white text-ink md:bottom-auto md:top-[var(--menu-top)] md:max-h-[75vh] md:shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-ink-100 p-4 md:hidden">
          <span className="text-lg font-bold">Каталог</span>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть"><X size={20} /></button>
        </div>
        <div className="container-tm grid gap-0 py-2 md:grid-cols-[300px_1fr] md:gap-6 md:py-6">
          <ul className="md:border-r md:border-ink-100 md:pr-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/catalog/${c.slug}`}
                  onMouseEnter={() => setActive(c.id)}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition md:py-2.5", active === c.id ? "md:bg-brand-50 md:text-brand" : "hover:bg-ink-50")}
                >
                  <CategoryIcon name={c.icon} size={20} className="shrink-0 text-brand" />
                  <span className="flex-1">{c.name}</span>
                  <ChevronRight size={16} className="text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            {current && (
              <motion.div key={current.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                <Link href={`/catalog/${current.slug}`} className="text-2xl font-extrabold hover:text-brand">{current.name}</Link>
                <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 lg:grid-cols-3">
                  <Link href={`/catalog/${current.slug}`} className="text-ink-600 hover:text-brand">Все товары категории</Link>
                  <Link href={`/catalog/${current.slug}?sort=new`} className="text-ink-600 hover:text-brand">Новинки</Link>
                  <Link href={`/catalog/${current.slug}?discount=1`} className="text-ink-600 hover:text-brand">Со скидкой</Link>
                  <Link href={`/catalog/${current.slug}?sort=rating`} className="text-ink-600 hover:text-brand">С высоким рейтингом</Link>
                  {current.children.map((ch) => (
                    <Link key={ch.id} href={`/catalog/${ch.slug}`} className="font-medium text-ink hover:text-brand">{ch.name}</Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function MobileNav({ onCatalog }: { onCatalog: () => void }) {
  const { cartCount: rawCount, favorites, user, openAuth, cartPulse } = useApp();
  const cartCount = useHydrated() ? rawCount : 0;
  const pathname = usePathname();
  const item = (active: boolean) => cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition", active ? "text-brand" : "text-ink-500");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[60px] border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Мобильная навигация">
      <Link href="/" className={item(pathname === "/")}><Home size={22} />Главная</Link>
      <button onClick={onCatalog} className={item(pathname.startsWith("/catalog"))}><LayoutGrid size={22} />Каталог</button>
      <Link href="/cart" className={item(pathname === "/cart")} data-cart-target="">
        <span key={cartPulse} className={cartPulse ? "animate-pop" : ""}><ShoppingCart size={22} /></span>Корзина
        {cartCount > 0 && <span className="absolute left-1/2 top-1 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">{cartCount}</span>}
      </Link>
      <Link href="/favorites" className={item(pathname === "/favorites")}>
        <Heart size={22} />Избранное
        {favorites.size > 0 && <span className="absolute left-1/2 top-1 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">{favorites.size}</span>}
      </Link>
      {user ? (
        <Link href="/account" className={item(pathname.startsWith("/account"))}><User size={22} />Профиль</Link>
      ) : (
        <button onClick={() => openAuth("login")} className={item(false)}><User size={22} />Войти</button>
      )}
    </nav>
  );
}
