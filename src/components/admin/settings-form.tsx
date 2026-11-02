"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useApp } from "../providers";
import { ImageUploader } from "../ui/image-uploader";
import { F, Toggle } from "./product-editor";
import type { SettingGroup } from "@/lib/settings-schema";
import { api } from "@/lib/client-api";

type Link = { label: string; href: string };

export function SettingsGroupForm({ group, initial, secrets, draft = false, onSaved }: { group: SettingGroup; initial: Record<string, unknown>; secrets: Record<string, boolean>; draft?: boolean; onSaved?: () => void }) {
  const { toast } = useApp();
  const router = useRouter();
  const [v, setV] = useState<Record<string, unknown>>(initial);
  const [sec, setSec] = useState<Record<string, string | null>>({});
  const [secStatus, setSecStatus] = useState(secrets);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: unknown) => setV((x) => ({ ...x, [k]: val }));

  async function save() {
    setBusy(true);
    try {
      const values: Record<string, unknown> = {};
      group.fields.forEach((f) => f.type !== "secret" && (values[f.key] = v[f.key]));
      const r = await api<{ secrets: Record<string, boolean> }>("/api/admin/settings", { method: "PUT", body: { group: group.key, values, secrets: Object.keys(sec).length ? sec : undefined, draft } });
      setSecStatus(r.secrets);
      setSec({});
      toast(draft ? "Черновик сохранён — нажмите «Опубликовать изменения»" : "Настройки сохранены и применены");
      router.refresh();
      onSaved?.();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {group.fields.map((f) => {
          const val = v[f.key];
          const wide = ["textarea", "image", "links"].includes(f.type);
          return (
            <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
              {f.type === "boolean" ? (
                <div className="rounded-xl border border-ink-100 px-3 py-1.5"><Toggle label={f.label} hint={f.help} value={Boolean(val)} onChange={(x) => set(f.key, x)} /></div>
              ) : f.type === "textarea" ? (
                <F label={f.label} hint={f.help}><textarea className="textarea" value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} /></F>
              ) : f.type === "number" ? (
                <F label={f.label} hint={f.help ?? (f.min !== undefined ? `${f.min}–${f.max ?? "∞"}` : undefined)}><input className="input" inputMode="numeric" value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} /></F>
              ) : f.type === "select" ? (
                <F label={f.label} hint={f.help}><select className="input" value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
              ) : f.type === "color" ? (
                <F label={f.label} hint={f.help}>
                  <div className="flex gap-2">
                    <input type="color" className="h-11 w-14 cursor-pointer rounded-btn border border-ink-200 bg-white p-1" value={String(val ?? "#000000")} onChange={(e) => set(f.key, e.target.value)} />
                    <input className="input font-mono uppercase" value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} maxLength={7} />
                  </div>
                </F>
              ) : f.type === "image" ? (
                <F label={f.label} hint={f.help}><ImageUploader value={val ? [String(val)] : []} onChange={(x) => set(f.key, x[x.length - 1] ?? "")} max={1} purpose="design" label="Загрузить" /></F>
              ) : f.type === "secret" ? (
                <F label={f.label} hint={f.help}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input type="password" autoComplete="new-password" className="input pl-9" placeholder={secStatus[f.key] ? "•••••••• задан (введите новый, чтобы заменить)" : "Не задан"} value={sec[f.key] ?? ""} onChange={(e) => setSec({ ...sec, [f.key]: e.target.value })} />
                    </div>
                    {secStatus[f.key] && <button type="button" className="btn-outline" onClick={() => setSec({ ...sec, [f.key]: "__clear__" })} title="Удалить ключ"><Trash2 size={16} /></button>}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{sec[f.key] === "__clear__" ? "Будет удалён при сохранении" : secStatus[f.key] ? "Хранится зашифрованным на сервере и не передаётся в браузер" : "Хранится зашифрованным на сервере"}</p>
                </F>
              ) : f.type === "links" ? (
                <LinksEditor label={f.label} value={(Array.isArray(val) ? val : []) as Link[]} onChange={(x) => set(f.key, x)} />
              ) : (
                <F label={f.label} hint={f.help}><input className="input" value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} /></F>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{draft ? "Сохранить черновик" : "Сохранить"}</button>
    </div>
  );
}

export function LinksEditor({ label, value, onChange }: { label: string; value: Link[]; onChange: (v: Link[]) => void }) {
  const upd = (i: number, p: Partial<Link>) => onChange(value.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const move = (i: number, d: number) => {
    const n = [...value];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <F label={label} hint="название · ссылка">
      <div className="space-y-2">
        {value.map((l, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex flex-col justify-center">
              <button type="button" onClick={() => move(i, -1)} className="text-ink-400 hover:text-brand" aria-label="Выше"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} className="text-ink-400 hover:text-brand" aria-label="Ниже"><ArrowDown size={14} /></button>
            </div>
            <input className="input h-10 text-sm" value={l.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Название" />
            <input className="input h-10 text-sm" value={l.href} onChange={(e) => upd(i, { href: e.target.value })} placeholder="/catalog/..." />
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-ink-100" aria-label="Удалить"><Trash2 size={15} /></button>
          </div>
        ))}
        <button type="button" className="btn-soft btn-sm" onClick={() => onChange([...value, { label: "", href: "/" }])}><Plus size={15} />Добавить ссылку</button>
      </div>
    </F>
  );
}
