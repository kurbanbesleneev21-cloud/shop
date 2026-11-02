"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../providers";
import { ImageUploader } from "../ui/image-uploader";
import { CategoryIcon, ICON_NAMES } from "../shop/category-icon";
import { F, Toggle } from "./product-editor";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea" | "number" | "date" | "content"; hint?: string; full?: boolean }
  | { name: string; label: string; type: "bool"; hint?: string; full?: boolean }
  | { name: string; label: string; type: "select"; options: [string, string][]; hint?: string; full?: boolean }
  | { name: string; label: string; type: "multi"; options: [string, string][]; hint?: string; full?: boolean }
  | { name: string; label: string; type: "image" | "icon" | "specTemplate"; hint?: string; full?: boolean };

type Item = Record<string, unknown> & { id: string };

export function CrudManager({ resource, items, fields, title, render, defaults, addLabel = "Добавить", sortable }: {
  resource: string; items: Item[]; fields: FieldDef[]; title: (i: Item) => string; render?: (i: Item) => React.ReactNode; defaults: Record<string, unknown>; addLabel?: string; sortable?: boolean;
}) {
  const { toast } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  function toForm(i: Item) {
    const out: Record<string, unknown> = { id: i.id };
    for (const f of fields) {
      let v = i[f.name];
      if (f.type === "date" && v) v = String(v).slice(0, 10);
      out[f.name] = v ?? (f.type === "bool" ? false : f.type === "multi" || f.type === "specTemplate" ? [] : "");
    }
    return out;
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    const { id, ...data } = editing;
    try {
      await api(`/api/admin/res/${resource}${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: data });
      toast("Сохранено");
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove(i: Item) {
    if (!confirm(`Удалить «${title(i)}»?`)) return;
    try {
      await api(`/api/admin/res/${resource}/${i.id}`, { method: "DELETE" });
      toast("Удалено");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  async function move(i: Item, dir: -1 | 1) {
    const idx = items.findIndex((x) => x.id === i.id);
    const other = items[idx + dir];
    if (!other) return;
    try {
      await api(`/api/admin/res/${resource}/${i.id}`, { method: "PUT", body: { ...stripId(toForm(i)), sortOrder: Number(other.sortOrder ?? idx + dir) } });
      await api(`/api/admin/res/${resource}/${other.id}`, { method: "PUT", body: { ...stripId(toForm(other)), sortOrder: Number(i.sortOrder ?? idx) } });
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  const set = (k: string, v: unknown) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <div>
      <div className="mb-4 flex justify-end"><button className="btn-primary" onClick={() => setEditing({ ...defaults })}><Plus size={18} />{addLabel}</button></div>
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        {items.length === 0 && <div className="p-10 text-center text-ink-500">Пока пусто</div>}
        <ul className="divide-y divide-ink-100">
          {items.map((i, k) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand/5">
              {sortable && (
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={k === 0} className="text-ink-400 hover:text-brand disabled:opacity-20" aria-label="Выше"><ArrowUp size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={k === items.length - 1} className="text-ink-400 hover:text-brand disabled:opacity-20" aria-label="Ниже"><ArrowDown size={14} /></button>
                </div>
              )}
              <div className="min-w-0 flex-1">{render ? render(i) : <span className="font-semibold">{title(i)}</span>}</div>
              <button onClick={() => setEditing(toForm(i))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-brand-50 hover:text-brand" aria-label="Редактировать"><Pencil size={16} /></button>
              <button onClick={() => remove(i)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100" aria-label="Удалить"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setEditing(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-lift">
              <div className="flex items-center justify-between border-b border-ink-100 p-4">
                <span className="text-lg font-bold">{editing.id ? "Редактирование" : addLabel}</span>
                <button onClick={() => setEditing(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть"><X /></button>
              </div>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
                {fields.map((f) => (
                  <div key={f.name} className={cn((f.full || ["textarea", "content", "image", "specTemplate", "multi", "icon"].includes(f.type)) && "sm:col-span-2")}>
                    <FieldInput f={f} value={editing[f.name]} onChange={(v) => set(f.name, v)} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-ink-100 p-4">
                <button className="btn-ghost" onClick={() => setEditing(null)}>Отмена</button>
                <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Сохранить</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function stripId(o: Record<string, unknown>) {
  const { id: _id, ...rest } = o;
  return rest;
}

function FieldInput({ f, value, onChange }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const [q, setQ] = useState("");
  switch (f.type) {
    case "bool":
      return <Toggle label={f.label} value={Boolean(value)} onChange={onChange} hint={f.hint} />;
    case "textarea":
      return <F label={f.label} hint={f.hint}><textarea className="textarea" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></F>;
    case "content":
      return <F label={f.label} hint={f.hint ?? "## Заголовок, - список, **жирный**"}><textarea className="textarea min-h-[320px] font-mono text-sm" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></F>;
    case "number":
      return <F label={f.label} hint={f.hint}><input className="input" inputMode="numeric" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></F>;
    case "date":
      return <F label={f.label} hint={f.hint}><input type="date" className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></F>;
    case "select":
      return <F label={f.label} hint={f.hint}><select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>;
    case "image":
      return <F label={f.label} hint={f.hint}><ImageUploader value={value ? [String(value)] : []} onChange={(v) => onChange(v[v.length - 1] ?? "")} max={1} purpose="design" label="Загрузить изображение" /></F>;
    case "icon":
      return (
        <F label={f.label}>
          <div className="flex flex-wrap gap-2">
            {ICON_NAMES.map((n) => (
              <button type="button" key={n} onClick={() => onChange(n)} className={cn("grid h-11 w-11 place-items-center rounded-xl border-2 transition", value === n ? "border-brand bg-brand-50 text-brand" : "border-ink-100 hover:border-ink-300")} title={n}>
                <CategoryIcon name={n} size={20} />
              </button>
            ))}
          </div>
        </F>
      );
    case "multi": {
      const sel = (Array.isArray(value) ? value : []) as string[];
      const opts = f.options.filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()));
      return (
        <F label={f.label} hint={`${sel.length} выбрано${f.hint ? " · " + f.hint : ""}`}>
          <input className="input mb-2 h-9 text-sm" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-ink-100 p-2">
            {opts.map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={sel.includes(v)} onChange={() => onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v])} />
                {l}
              </label>
            ))}
          </div>
        </F>
      );
    }
    case "specTemplate": {
      const rows = (Array.isArray(value) ? value : []) as { key: string; label: string; filter?: string }[];
      const upd = (i: number, patch: Partial<(typeof rows)[number]>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
      return (
        <F label={f.label} hint="ключ · название · фильтр каталога">
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_1fr_auto] gap-2">
                <input className="input h-9 text-sm" placeholder="key" value={r.key} onChange={(e) => upd(i, { key: e.target.value })} />
                <input className="input h-9 text-sm" placeholder="Название" value={r.label} onChange={(e) => upd(i, { label: e.target.value })} />
                <select className="input h-9 text-sm" value={r.filter ?? ""} onChange={(e) => upd(i, { filter: e.target.value })}>
                  <option value="">—</option><option value="color">Цвет</option><option value="memory">Память</option><option value="diagonal">Диагональ</option><option value="processor">Процессор</option>
                </select>
                <button type="button" onClick={() => onChange(rows.filter((_, k) => k !== i))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100" aria-label="Удалить"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn-soft btn-sm" onClick={() => onChange([...rows, { key: "", label: "", filter: "" }])}><Plus size={15} />Характеристика</button>
          </div>
        </F>
      );
    }
    default:
      return <F label={f.label} hint={f.hint}><input className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></F>;
  }
}
