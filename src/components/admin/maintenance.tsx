"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

type Info = { counts: Record<string, number>; users: { id: string; name: string; email: string; phone: string | null; role: string; createdAt: string }[] };

export function MaintenancePanel() {
  const { toast, user } = useApp();
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [confirm, setConfirm] = useState("");
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const load = () => api<Info>("/api/admin/maintenance").then(setInfo).catch((e) => toast((e as Error).message, "error"));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: string) {
    setBusy(action);
    try {
      const r = await api<{ result: Record<string, number> }>("/api/admin/maintenance", { body: { action, confirm, keepUserIds: [...keep] } });
      toast("Удалено: " + Object.entries(r.result).map(([k, v]) => `${k} — ${v}`).join(", "));
      setConfirm("");
      await load();
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  const c = info?.counts;
  const ready = confirm === "УДАЛИТЬ";
  return (
    <div className="mt-6 space-y-4 rounded-xl border-2 border-ink-200 p-4">
      <div className="flex items-center gap-2 font-bold"><AlertTriangle size={18} className="text-brand" />Очистка данных</div>
      <p className="text-sm text-ink-500">Удаляет демо-данные перед запуском. Действие необратимо — сначала скачайте резервную копию. Категории, бренды, страницы и настройки сохраняются.</p>
      {c && <div className="flex flex-wrap gap-2 text-xs">{Object.entries({ products: "товары", reviews: "отзывы", orders: "заказы", payouts: "выплаты", users: "пользователи", sellers: "продавцы", tickets: "обращения" }).map(([k, l]) => <span key={k} className="rounded-full bg-ink-100 px-2.5 py-1">{l}: <b>{c[k]}</b></span>)}</div>}
      <div><label className="label">Для подтверждения введите слово УДАЛИТЬ</label><input className="input max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-dark btn-sm" disabled={!ready || !!busy} onClick={() => run("purge-catalog")}>{busy === "purge-catalog" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Удалить все товары и отзывы</button>
        <button className="btn-dark btn-sm" disabled={!ready || !!busy} onClick={() => run("purge-orders")}>{busy === "purge-orders" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Удалить все заказы, доходы и выплаты</button>
      </div>
      {info && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Удаление пользователей: отметьте тех, кого оставить (вы — {user?.email} — сохраняетесь всегда)</div>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-2">
            {info.users.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={keep.has(u.id) || u.id === user?.id} disabled={u.id === user?.id} onChange={() => setKeep((s) => { const n = new Set(s); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n; })} />
                <span className="flex-1">{u.name} · {u.email}{u.phone ? ` · ${u.phone}` : ""}</span>
                <span className="text-xs text-ink-400">{u.role} · {formatDate(u.createdAt)}</span>
              </label>
            ))}
          </div>
          <button className="btn-dark btn-sm" disabled={!ready || !!busy} onClick={() => run("purge-users")}>{busy === "purge-users" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Удалить всех неотмеченных пользователей</button>
        </div>
      )}
    </div>
  );
}
