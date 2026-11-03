"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type SavedAddress = { id: string; city: string; line: string; zip: string | null; isDefault: boolean };

export function AddressBook() {
  const { toast } = useApp();
  const [items, setItems] = useState<SavedAddress[] | null>(null);
  const [form, setForm] = useState({ city: "", line: "", zip: "" });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState("");

  const [loadErr, setLoadErr] = useState("");
  const load = () =>
    api<{ items: SavedAddress[] }>("/api/account/addresses")
      .then((d) => {
        setItems(d.items);
        setLoadErr("");
      })
      .catch((e) => setLoadErr((e as Error).message || "Не удалось загрузить адреса"));
  useEffect(() => {
    load();
  }, []);

  async function run(key: string, fn: () => Promise<unknown>, msg?: string) {
    setBusy(key);
    try {
      await fn();
      await load();
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  if (loadErr && items === null)
    return (
      <div role="alert" className="rounded-card bg-ink-50 p-6 text-center">
        <p className="font-semibold">Не удалось загрузить адреса</p>
        <p className="mt-1 text-sm text-ink-500">{loadErr}</p>
        <button onClick={() => load()} className="btn-outline mt-4">Повторить</button>
      </div>
    );
  if (items === null) return <div className="skeleton h-32 w-full" />;
  return (
    <div className="space-y-3">
      {items.length === 0 && !adding && (
        <div className="grid place-items-center rounded-card bg-ink-50 py-12 text-center">
          <MapPin size={40} className="text-brand" />
          <h2 className="mt-3 text-xl font-bold">Нет сохранённых адресов</h2>
          <p className="mt-1 text-sm text-ink-500">Сохраните адрес — при оформлении заказа он подставится сам</p>
        </div>
      )}
      {items.map((a) => (
        <div key={a.id} className={cn("flex items-start gap-3 rounded-card border-2 p-4", a.isDefault ? "border-brand bg-brand-50" : "border-ink-100")}>
          <MapPin size={20} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{a.city}</div>
            <div className="text-sm text-ink-600">{a.line}{a.zip ? `, ${a.zip}` : ""}</div>
            {a.isDefault ? (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand"><Check size={14} />Основной адрес</span>
            ) : (
              <button onClick={() => run("d" + a.id, () => api("/api/account/addresses", { method: "PATCH", body: { id: a.id } }), "Основной адрес изменён")} className="mt-2 text-xs font-semibold text-brand">Сделать основным</button>
            )}
          </div>
          <button onClick={() => run("x" + a.id, () => api(`/api/account/addresses?id=${a.id}`, { method: "DELETE" }), "Адрес удалён")} className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-white hover:text-ink" aria-label="Удалить адрес">
            {busy === "x" + a.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      ))}
      {adding ? (
        <form
          className="space-y-3 rounded-card border border-ink-100 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("add", async () => {
              await api("/api/account/addresses", { body: form });
              setForm({ city: "", line: "", zip: "" });
              setAdding(false);
            }, "Адрес сохранён");
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_120px]">
            <label className="block"><span className="label">Город</span><input className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" placeholder="Москва" /></label>
            <label className="block"><span className="label">Улица, дом, квартира</span><input className="input" required value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} autoComplete="street-address" /></label>
            <label className="block"><span className="label">Индекс</span><input className="input" inputMode="numeric" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value.replace(/\D/g, "").slice(0, 6) })} autoComplete="postal-code" /></label>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy === "add"}>{busy === "add" && <Loader2 size={16} className="animate-spin" />}Сохранить</button>
            <button type="button" className="btn-outline" onClick={() => setAdding(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        items.length < 10 && <button onClick={() => setAdding(true)} className="btn-outline w-full"><Plus size={18} />Добавить адрес</button>
      )}
    </div>
  );
}
