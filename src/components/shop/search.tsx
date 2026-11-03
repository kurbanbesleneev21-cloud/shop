"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Clock, Loader2, Search, X, TrendingUp } from "lucide-react";
import { useApp } from "../providers";
import { ProductImage } from "./product-image";
import { CategoryIcon } from "./category-icon";
import { useDialog } from "../use-dialog";
import { cn, formatPrice } from "@/lib/utils";
import type { NavCategory } from "./header";

type Suggest = { products: { id: string; title: string; slug: string; price: number; image: string | null }[]; categories: { name: string; slug: string }[] };
const HIST_KEY = "tm_search_hist";

function readHistory(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(HIST_KEY) || "[]") as string[]).filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    return [];
  }
}
function pushHistory(q: string) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify([q, ...readHistory().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 10)));
  } catch {}
}
function clearHistory() {
  try {
    localStorage.removeItem(HIST_KEY);
  } catch {}
}

function useSuggest(q: string) {
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    ctrl.current?.abort();
    if (q.trim().length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    const c = new AbortController();
    ctrl.current = c;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: c.signal });
        if (r.ok && !c.signal.aborted) setData(await r.json());
      } catch {
        // aborted or offline: suggestions are optional, the full search still works on Enter
      }
      if (ctrl.current === c) setLoading(false);
    }, 220);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q]);
  return { data, loading };
}

function useSearchNav() {
  const router = useRouter();
  return (q: string) => {
    const v = q.trim();
    if (!v) return;
    pushHistory(v);
    router.push(`/catalog?q=${encodeURIComponent(v)}`);
  };
}

/** Shared panel: history + popular categories when the query is empty, suggestions otherwise. */
function Panel({ q, data, categories, onPick, onNavigate }: { q: string; data: Suggest | null; categories: NavCategory[]; onPick: (q: string) => void; onNavigate: () => void }) {
  const { config } = useApp();
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => setHistory(readHistory()), []);
  if (q.trim().length < 2) {
    return (
      <div className="space-y-5 p-4">
        {history.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">Вы искали</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { clearHistory(); setHistory([]); }} className="text-xs font-semibold text-ink-500 hover:text-brand">Очистить</button>
            </div>
            <div className="space-y-0.5">
              {history.map((h) => (
                <button type="button" key={h} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(h)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] hover:bg-ink-50">
                  <Clock size={16} className="text-ink-400" />{h}
                </button>
              ))}
            </div>
          </div>
        )}
        {categories.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-bold"><TrendingUp size={16} className="text-brand" />Популярные категории</div>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 10).map((c) => (
                <Link key={c.id} href={`/catalog/${c.slug}`} onClick={onNavigate} className="chip h-9 text-sm"><CategoryIcon name={c.icon} size={16} className="text-brand" />{c.name}</Link>
              ))}
            </div>
          </div>
        )}
        {!history.length && !categories.length && <div className="py-6 text-center text-sm text-ink-500">Введите название товара, бренд или модель</div>}
      </div>
    );
  }
  if (!data) return null;
  if (!data.products.length && !data.categories.length) {
    return <div className="p-4 text-sm text-ink-500">Нажмите «Найти», чтобы искать «{q}» во всём каталоге</div>;
  }
  return (
    <div>
      {data.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-ink-100 p-3">
          {data.categories.map((c) => <Link key={c.slug} href={`/catalog/${c.slug}`} onClick={onNavigate} className="chip h-8 text-xs">{c.name}</Link>)}
        </div>
      )}
      {data.products.map((p) => (
        <Link key={p.id} href={`/product/${p.slug}`} onClick={() => { pushHistory(q.trim()); onNavigate(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-brand-50">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-50"><ProductImage src={p.image} alt="" sizes="44px" /></span>
          <span className="line-clamp-2 flex-1 text-sm">{p.title}</span>
          <span className="text-sm font-bold">{formatPrice(p.price, config.currency)}</span>
        </Link>
      ))}
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(q)} className="w-full border-t border-ink-100 px-3 py-3 text-left text-sm font-semibold text-brand hover:bg-brand-50">Все результаты по запросу «{q}»</button>
    </div>
  );
}

function Field({ q, setQ, loading, dark, autoFocus, onFocus, onBlur, inputRef }: { q: string; setQ: (v: string) => void; loading: boolean; dark?: boolean; autoFocus?: boolean; onFocus?: () => void; onBlur?: () => void; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className={cn("flex h-11 flex-1 items-center rounded-btn border-2 bg-white transition focus-within:border-brand", dark ? "border-white/20" : "border-brand")}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder="Искать на TECHMARKET"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-[16px] text-ink outline-none placeholder:text-ink-500"
        aria-label="Поиск товаров"
        enterKeyHint="search"
        inputMode="search"
        type="text"
        autoComplete="off"
      />
      {q && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ("")} className="grid h-9 w-9 place-items-center text-ink-400 hover:text-ink" aria-label="Очистить"><X size={16} /></button>}
      <button className="mr-0.5 grid h-9 w-11 place-items-center rounded-[calc(var(--radius)*.55)] bg-brand text-white hover:bg-brand-600" aria-label="Найти">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
      </button>
    </div>
  );
}

export function DesktopSearch({ dark, categories }: { dark: boolean; categories: NavCategory[] }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const { data, loading } = useSuggest(q);
  const go = useSearchNav();
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    inputRef.current?.blur();
    go(q);
  };
  return (
    <form
      onSubmit={submit}
      className="relative hidden min-w-0 flex-1 md:flex"
      role="search"
      onBlur={(e) => {
        // close only when focus leaves the whole search (keeps suggestions reachable with Tab)
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Field q={q} setQ={(v) => { setQ(v); setOpen(true); }} loading={loading} dark={dark} onFocus={() => setOpen(true)} inputRef={inputRef} />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-100 bg-white text-ink shadow-lift empty:hidden">
            <Panel q={q} data={data} categories={categories} onPick={(v) => { setQ(v); setOpen(false); inputRef.current?.blur(); go(v); }} onNavigate={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

/** Mobile: tapping the search bar opens a full-screen search like in marketplace apps. */
export function MobileSearch({ categories }: { categories: NavCategory[] }) {
  const sp = useSearchParams();
  const current = sp.get("q") ?? "";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-btn border-2 border-brand bg-white px-3 text-left text-[15px] text-ink-400 md:hidden" aria-label="Открыть поиск">
        <Search size={18} className="shrink-0 text-brand" />
        <span className={cn("truncate", current && "text-ink")}>{current || "Искать на TECHMARKET"}</span>
      </button>
      {mounted && createPortal(<AnimatePresence>{open && <MobileOverlay initial={current} categories={categories} onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </>
  );
}

function MobileOverlay({ initial, categories, onClose }: { initial: string; categories: NavCategory[]; onClose: () => void }) {
  const [q, setQ] = useState(initial);
  const { data, loading } = useSuggest(q);
  const go = useSearchNav();
  const ref = useDialog(true, onClose, { lockScroll: false });
  const pick = (v: string) => {
    onClose();
    go(v);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }} ref={ref} className="fixed inset-0 z-[90] flex flex-col bg-white text-ink md:hidden" role="dialog" aria-modal="true" aria-label="Поиск">
      <form onSubmit={(e) => { e.preventDefault(); pick(q); }} className="flex items-center gap-1 border-b border-ink-100 p-2 pt-[max(8px,env(safe-area-inset-top))]" role="search">
        <button type="button" onClick={onClose} className="grid h-11 w-10 shrink-0 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть поиск"><ArrowLeft size={22} /></button>
        <Field q={q} setQ={setQ} loading={loading} autoFocus />
      </form>
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        <Panel q={q} data={data} categories={categories} onPick={pick} onNavigate={onClose} />
      </div>
    </motion.div>
  );
}
