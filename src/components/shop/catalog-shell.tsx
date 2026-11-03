"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal, X, Star } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

type Opt = { value: string; label?: string; count: number };
export type FacetsData = { brands: Opt[]; colors: Opt[]; memory: Opt[]; diagonal: Opt[]; processor: Opt[]; priceMin: number; priceMax: number };

const SORTS = [
  ["popular", "По популярности"],
  ["rating", "По рейтингу"],
  ["price_asc", "Сначала дешевле"],
  ["price_desc", "Сначала дороже"],
  ["new", "Новинки"],
] as const;

const NavCtx = createContext<{ pending: boolean; update: (patch: Record<string, string | string[] | null>) => void }>({ pending: false, update: () => {} });

export function CatalogShell({ facets, defaultSort, showFilters, total, children }: { facets: FacetsData; defaultSort: string; showFilters: boolean; total: number; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);

  const update = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      next.delete(k);
      if (Array.isArray(v)) v.length && next.set(k, v.join(","));
      else if (v) next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    start(() => router.push(`${pathname}${next.toString() ? "?" + next.toString() : ""}`, { scroll: false }));
  };

  const sort = sp.get("sort") || defaultSort;
  const active = activeChips(sp, facets);

  return (
    <NavCtx.Provider value={{ pending, update }}>
      <div className="sticky top-[57px] z-30 -mx-4 flex items-center gap-2 border-b border-ink-100 bg-white/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button onClick={() => setSortSheet(true)} className="chip shrink-0 md:hidden" aria-haspopup="dialog">
          <ArrowUpDown size={16} /> {SORTS.find(([k]) => k === sort)?.[1] ?? "Сортировка"}
        </button>
        {showFilters && (
          <button onClick={() => setSheet(true)} className={cn("chip shrink-0 lg:hidden", active.length > 0 && "chip-active")}>
            <SlidersHorizontal size={16} /> Фильтры {active.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] text-brand">{active.length}</span>}
          </button>
        )}
        <div className="-mr-4 flex flex-1 gap-2 overflow-x-auto pr-4 scrollbar-none md:hidden">
          {([["stock", "В наличии"], ["discount", "Со скидкой"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => update({ [k]: sp.get(k) === "1" ? null : "1" })} className={cn("chip shrink-0", sp.get(k) === "1" && "chip-active")}>{l}</button>
          ))}
        </div>
        <div className="-mx-1 hidden flex-1 gap-2 overflow-x-auto px-1 scrollbar-none md:flex">
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => update({ sort: k === defaultSort ? null : k })} className={cn("chip shrink-0", sort === k && "chip-active")}>{l}</button>
          ))}
        </div>
      </div>
      {active.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {active.map((a) => (
            <button key={a.key + a.value} onClick={() => update({ [a.key]: a.rest })} className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand hover:bg-brand-100">
              {a.label} <X size={14} />
            </button>
          ))}
          <button onClick={() => update({ brand: null, color: null, memory: null, diagonal: null, processor: null, min: null, max: null, rating: null, stock: null, discount: null, model: null })} className="h-8 px-2 text-xs font-semibold text-ink-500 hover:text-brand">Сбросить всё</button>
        </div>
      )}
      <div className={cn("mt-4 grid gap-6", showFilters && "lg:grid-cols-[260px_1fr]")}>
        {showFilters && (
          <aside className="hidden lg:block">
            <div className="sticky top-32"><Filters facets={facets} /></div>
          </aside>
        )}
        <div className={cn("relative min-w-0 transition-opacity duration-200", pending && "pointer-events-none opacity-50")} aria-busy={pending}>
          {pending && <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded bg-brand-100"><div className="h-full w-1/3 animate-[shimmer_1s_infinite] bg-brand" /></div>}
          {children}
        </div>
      </div>
      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[80] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setSheet(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 300 }} className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white sm:inset-y-0 sm:left-0 sm:right-auto sm:max-h-none sm:w-[88%] sm:max-w-sm sm:rounded-none">
              <div className="flex items-center justify-between border-b border-ink-100 p-4">
                <span className="text-lg font-bold">Фильтры</span>
                <button onClick={() => setSheet(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4"><Filters facets={facets} /></div>
              <div className="border-t border-ink-100 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><button onClick={() => setSheet(false)} className="btn-primary btn-lg w-full">Показать {total} товаров</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sortSheet && (
          <motion.div className="fixed inset-0 z-[80] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setSortSheet(false)} />
            <motion.div role="dialog" aria-label="Сортировка" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink-200" />
              <div className="mb-2 text-lg font-bold">Сортировка</div>
              {SORTS.map(([k, l]) => (
                <button key={k} onClick={() => { setSortSheet(false); update({ sort: k === defaultSort ? null : k }); }} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left text-[15px]", sort === k ? "bg-brand-50 font-semibold text-brand" : "hover:bg-ink-50")}>
                  {l}{sort === k && <Check size={18} />}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NavCtx.Provider>
  );
}

function activeChips(sp: URLSearchParams, f: FacetsData) {
  const out: { key: string; value: string; label: string; rest: string[] | null }[] = [];
  const multi = (key: string, opts: Opt[]) => {
    const vals = (sp.get(key) || "").split(",").filter(Boolean);
    vals.forEach((v) => out.push({ key, value: v, label: opts.find((o) => o.value === v)?.label || v, rest: vals.filter((x) => x !== v) }));
  };
  multi("brand", f.brands);
  multi("color", f.colors);
  multi("memory", f.memory);
  multi("diagonal", f.diagonal);
  multi("processor", f.processor);
  if (sp.get("min")) out.push({ key: "min", value: "", label: `от ${formatPrice(Number(sp.get("min")))}`, rest: null });
  if (sp.get("max")) out.push({ key: "max", value: "", label: `до ${formatPrice(Number(sp.get("max")))}`, rest: null });
  if (sp.get("rating")) out.push({ key: "rating", value: "", label: `Рейтинг от ${sp.get("rating")}`, rest: null });
  if (sp.get("stock")) out.push({ key: "stock", value: "", label: "В наличии", rest: null });
  if (sp.get("discount")) out.push({ key: "discount", value: "", label: "Со скидкой", rest: null });
  if (sp.get("model")) out.push({ key: "model", value: "", label: `Модель: ${sp.get("model")}`, rest: null });
  return out;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink-100 py-4 first:pt-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left font-bold" aria-expanded={open}>
        {title}
        <ChevronDown size={18} className={cn("text-ink-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckList({ name, options }: { name: string; options: Opt[] }) {
  const sp = useSearchParams();
  const { update } = useContext(NavCtx);
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const selected = (sp.get(name) || "").split(",").filter(Boolean);
  const filtered = options.filter((o) => (o.label || o.value).toLowerCase().includes(q.toLowerCase()));
  const shown = all ? filtered : filtered.slice(0, 6);
  return (
    <div className="space-y-1">
      {options.length > 8 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти" className="input mb-2 h-9 text-sm" />}
      {shown.map((o) => {
        const checked = selected.includes(o.value);
        return (
          <label key={o.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-ink-50">
            <input type="checkbox" checked={checked} onChange={() => update({ [name]: checked ? selected.filter((x) => x !== o.value) : [...selected, o.value] })} className="h-[18px] w-[18px] rounded accent-[rgb(var(--brand))]" />
            <span className="flex-1">{o.label || o.value}</span>
            <span className="text-xs text-ink-400">{o.count}</span>
          </label>
        );
      })}
      {filtered.length > 6 && <button onClick={() => setAll((v) => !v)} className="mt-1 text-sm font-semibold text-brand">{all ? "Свернуть" : `Показать все (${filtered.length})`}</button>}
    </div>
  );
}

function Toggle({ name, label }: { name: string; label: string }) {
  const sp = useSearchParams();
  const { update } = useContext(NavCtx);
  const on = sp.get(name) === "1";
  return (
    <button onClick={() => update({ [name]: on ? null : "1" })} className="flex w-full items-center justify-between py-1.5 text-sm font-medium" role="switch" aria-checked={on}>
      {label}
      <span className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", on ? "bg-brand" : "bg-ink-200")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function PriceRange({ min, max }: { min: number; max: number }) {
  const sp = useSearchParams();
  const { update } = useContext(NavCtx);
  const [a, setA] = useState(sp.get("min") ?? "");
  const [b, setB] = useState(sp.get("max") ?? "");
  useEffect(() => {
    setA(sp.get("min") ?? "");
    setB(sp.get("max") ?? "");
  }, [sp]);
  const apply = () => update({ min: a.replace(/\D/g, "") || null, max: b.replace(/\D/g, "") || null });
  return (
    <div>
      <div className="flex items-center gap-2">
        <input value={a} onChange={(e) => setA(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === "Enter" && apply()} inputMode="numeric" placeholder={`от ${min}`} className="input h-10 text-sm" aria-label="Цена от" />
        <span className="text-ink-300">—</span>
        <input value={b} onChange={(e) => setB(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === "Enter" && apply()} inputMode="numeric" placeholder={`до ${max}`} className="input h-10 text-sm" aria-label="Цена до" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[[0, 10000], [10000, 30000], [30000, 70000], [70000, 0]].map(([x, y]) => (
          <button key={x + "-" + y} onClick={() => update({ min: x ? String(x) : null, max: y ? String(y) : null })} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium hover:bg-brand-50 hover:text-brand">
            {x && y ? `${x / 1000}–${y / 1000} тыс.` : x ? `от ${x / 1000} тыс.` : `до ${y / 1000} тыс.`}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelInput() {
  const sp = useSearchParams();
  const { update } = useContext(NavCtx);
  const [v, setV] = useState(sp.get("model") ?? "");
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => update({ model: v.trim() || null })} onKeyDown={(e) => e.key === "Enter" && update({ model: v.trim() || null })} placeholder="Например, Galaxy S25" className="input h-10 text-sm" />;
}

function Filters({ facets }: { facets: FacetsData }) {
  const sp = useSearchParams();
  const { update } = useContext(NavCtx);
  const rating = sp.get("rating");
  return (
    <div>
      <Section title="Цена"><PriceRange min={facets.priceMin} max={facets.priceMax} /></Section>
      <Section title="Наличие и скидки">
        <Toggle name="stock" label="Только в наличии" />
        <Toggle name="discount" label="Со скидкой" />
      </Section>
      {facets.brands.length > 0 && <Section title="Производитель"><CheckList name="brand" options={facets.brands} /></Section>}
      <Section title="Модель" defaultOpen={false}><ModelInput /></Section>
      {facets.colors.length > 0 && <Section title="Цвет"><CheckList name="color" options={facets.colors} /></Section>}
      {facets.memory.length > 0 && <Section title="Память"><CheckList name="memory" options={facets.memory} /></Section>}
      {facets.diagonal.length > 0 && <Section title="Диагональ"><CheckList name="diagonal" options={facets.diagonal} /></Section>}
      {facets.processor.length > 0 && <Section title="Процессор" defaultOpen={false}><CheckList name="processor" options={facets.processor} /></Section>}
      <Section title="Рейтинг">
        <div className="flex flex-wrap gap-2">
          {["4.5", "4", "3"].map((r) => (
            <button key={r} onClick={() => update({ rating: rating === r ? null : r })} className={cn("chip h-8 text-xs", rating === r && "chip-active")}>
              <Star size={13} fill="currentColor" /> от {r}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const { update } = useContext(NavCtx);
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Страницы">
      {nums.map((n, i) =>
        n === "…" ? <span key={"e" + i} className="px-2 text-ink-400">…</span> : (
          <button key={n} onClick={() => { update({ page: n === 1 ? null : String(n) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cn("h-10 min-w-10 rounded-btn px-3 text-sm font-semibold transition", n === page ? "bg-brand text-white" : "bg-ink-100 hover:bg-brand-50 hover:text-brand")} aria-current={n === page ? "page" : undefined}>
            {n}
          </button>
        ),
      )}
    </nav>
  );
}
