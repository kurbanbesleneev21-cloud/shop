"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Rocket, Trash2, Undo2, GripVertical } from "lucide-react";
import { useApp } from "../providers";
import { SettingsGroupForm } from "./settings-form";
import { BannersManager } from "./managers";
import { F, Toggle } from "./product-editor";
import { SETTINGS_GROUPS, type HomeBlock } from "@/lib/settings-schema";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const g = (k: string) => SETTINGS_GROUPS.find((x) => x.key === k)!;
const brandGroup = { ...g("general"), title: "Логотип и название", fields: g("general").fields.filter((f) => ["siteName", "tagline", "logoUrl", "faviconUrl"].includes(f.key)) };

const TABS = [
  ["brand", "Логотип и название"],
  ["design", "Цвета и шрифты"],
  ["home", "Главная страница"],
  ["banners", "Баннеры"],
  ["menu", "Меню"],
  ["footer", "Футер"],
  ["contacts", "Контакты"],
  ["social", "Соцсети"],
  ["ads", "Реклама"],
] as const;

export function AppearanceView({ values, hasDrafts, banners, categories, products }: { values: Record<string, Record<string, unknown>>; hasDrafts: boolean; banners: (Record<string, unknown> & { id: string })[]; categories: [string, string][]; products: [string, string][] }) {
  const { toast } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("brand");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(hasDrafts);

  async function act(action: string) {
    setBusy(action);
    try {
      await api("/api/admin/settings", { body: { action } });
      if (action === "preview-on") window.open("/", "_blank");
      if (action === "publish") { toast("Изменения опубликованы на сайте"); setDirty(false); }
      if (action === "discard") { toast("Черновик удалён", "info"); setDirty(false); }
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-ink-100 bg-ink-50/95 px-4 py-3 backdrop-blur lg:top-0">
        <span className={cn("mr-auto flex items-center gap-2 text-sm font-medium", dirty ? "text-brand" : "text-ink-500")}>
          <span className={cn("h-2 w-2 rounded-full", dirty ? "bg-brand" : "bg-ink-300")} />
          {dirty ? "Есть неопубликованные изменения" : "Все изменения опубликованы"}
        </span>
        <button className="btn-outline btn-sm" onClick={() => act("preview-on")} disabled={!!busy}>{busy === "preview-on" ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}Предварительный просмотр</button>
        {dirty && <button className="btn-ghost btn-sm" onClick={() => confirm("Удалить все неопубликованные изменения?") && act("discard")} disabled={!!busy}><Undo2 size={15} />Отменить</button>}
        <button className="btn-primary btn-sm" onClick={() => act("publish")} disabled={!!busy}>{busy === "publish" ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}Опубликовать изменения</button>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition", tab === k ? "bg-brand text-white" : "bg-white hover:bg-ink-100")}>{l}</button>)}
      </div>

      <div className="rounded-card bg-white p-4 shadow-card sm:p-6">
        {tab === "brand" && <SettingsGroupForm group={brandGroup} initial={values.general} secrets={{}} draft onSaved={() => setDirty(true)} />}
        {(["design", "menu", "footer", "contacts", "social", "ads"] as const).map((k) => tab === k && <SettingsGroupForm key={k} group={g(k)} initial={values[k]} secrets={{}} draft onSaved={() => setDirty(true)} />)}
        {tab === "design" && (
          <p className="mt-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">Фирменная палитра TECHMARKET: чёрный #111111, белый #FFFFFF и синий #2563EB. Оттенки для наведения и нажатия рассчитываются автоматически.</p>
        )}
        {tab === "home" && <HomeBlocksEditor initial={(values.home?.blocks as HomeBlock[]) ?? []} categories={categories} products={products} onSaved={() => setDirty(true)} />}
        {tab === "banners" && (
          <div>
            <p className="mb-4 text-sm text-ink-500">Баннеры публикуются сразу после сохранения.</p>
            <BannersManager items={banners} />
          </div>
        )}
      </div>
    </div>
  );
}

function HomeBlocksEditor({ initial, categories, products, onSaved }: { initial: HomeBlock[]; categories: [string, string][]; products: [string, string][]; onSaved: () => void }) {
  const { toast } = useApp();
  const router = useRouter();
  const [blocks, setBlocks] = useState<HomeBlock[]>(initial);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const upd = (i: number, p: Partial<HomeBlock>) => setBlocks((b) => b.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (from: number, to: number) => setBlocks((b) => {
    if (to < 0 || to >= b.length) return b;
    const n = [...b];
    const [m] = n.splice(from, 1);
    n.splice(to, 0, m);
    return n;
  });
  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/settings", { method: "PUT", body: { group: "home", values: { blocks }, draft: true } });
      toast("Черновик главной сохранён — опубликуйте изменения");
      onSaved();
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">Перетаскивайте блоки, чтобы изменить порядок. Включайте и выключайте блоки, меняйте заголовки и источник товаров.</p>
      {blocks.map((b, i) => (
        <div
          key={b.id}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
          className={cn("rounded-xl border-2 p-3 transition", b.enabled ? "border-ink-100 bg-white" : "border-dashed border-ink-200 bg-ink-50 opacity-70", drag === i && "opacity-40")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <GripVertical size={18} className="cursor-grab text-ink-300" />
            <div className="flex flex-col"><button onClick={() => move(i, i - 1)} className="text-ink-400 hover:text-brand" aria-label="Выше"><ArrowUp size={14} /></button><button onClick={() => move(i, i + 1)} className="text-ink-400 hover:text-brand" aria-label="Ниже"><ArrowDown size={14} /></button></div>
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold uppercase text-ink-500">{{ hero: "Баннер", categories: "Категории", products: "Товары", brands: "Бренды", promo: "Акции", advantages: "Преимущества" }[b.type]}</span>
            <input className="input h-9 min-w-[180px] flex-1 text-sm font-semibold" value={b.title} onChange={(e) => upd(i, { title: e.target.value })} />
            <div className="w-36"><Toggle label={b.enabled ? "Включён" : "Выключен"} value={b.enabled} onChange={(v) => upd(i, { enabled: v })} /></div>
            <button onClick={() => setBlocks((x) => x.filter((_, k) => k !== i))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100" aria-label="Удалить блок"><Trash2 size={15} /></button>
          </div>
          {b.type === "products" && (
            <div className="mt-3 grid gap-3 pl-10 sm:grid-cols-3">
              <F label="Источник"><select className="input h-10 text-sm" value={b.source} onChange={(e) => upd(i, { source: e.target.value as HomeBlock["source"] })}>
                <option value="hits">Хиты продаж</option><option value="new">Новинки</option><option value="discount">Со скидкой</option><option value="featured">Рекомендуемые</option><option value="category">Из категории</option><option value="manual">Выбранные вручную</option>
              </select></F>
              {b.source === "category" && <F label="Категория"><select className="input h-10 text-sm" value={b.category} onChange={(e) => upd(i, { category: e.target.value })}>{categories.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></F>}
              <F label="Количество"><input className="input h-10 text-sm" value={b.limit ?? 10} onChange={(e) => upd(i, { limit: Number(e.target.value) || 10 })} /></F>
              {b.source === "manual" && (
                <div className="sm:col-span-3">
                  <F label={`Популярные товары (${b.productIds?.length ?? 0})`}>
                    <select className="input h-10 text-sm" value="" onChange={(e) => e.target.value && upd(i, { productIds: [...(b.productIds ?? []), e.target.value].slice(0, 24) })}>
                      <option value="">+ Добавить товар</option>
                      {products.filter(([id]) => !b.productIds?.includes(id)).map(([id, t]) => <option key={id} value={id}>{t}</option>)}
                    </select>
                  </F>
                  <div className="mt-2 flex flex-wrap gap-1.5">{(b.productIds ?? []).map((id) => <button key={id} onClick={() => upd(i, { productIds: b.productIds!.filter((x) => x !== id) })} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-100">{products.find(([x]) => x === id)?.[1] ?? id} ×</button>)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-soft btn-sm" onClick={() => setBlocks((b) => [...b, { id: "b" + Date.now().toString(36), type: "products", title: "Новая подборка", source: "hits", limit: 10, enabled: true }])}><Plus size={15} />Подборка товаров</button>
        {(["hero", "categories", "promo", "brands", "advantages"] as const).filter((t) => !blocks.some((b) => b.type === t)).map((t) => (
          <button key={t} className="btn-soft btn-sm" onClick={() => setBlocks((b) => [...b, { id: t + Date.now().toString(36), type: t, title: { hero: "Главный баннер", categories: "Популярные категории", promo: "Специальные предложения", brands: "Популярные бренды", advantages: "Почему мы" }[t], enabled: true }])}><Plus size={15} />{{ hero: "Баннер", categories: "Категории", promo: "Акции", brands: "Бренды", advantages: "Преимущества" }[t]}</button>
        ))}
      </div>
      <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Сохранить черновик главной</button>
    </div>
  );
}
