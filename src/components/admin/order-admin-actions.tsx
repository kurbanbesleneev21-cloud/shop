"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { ORDER_STATUS_LABELS, cn } from "@/lib/utils";

export function OrderAdminActions({ id, status, next, paymentStatus }: { id: string; status: string; next: string[]; paymentStatus: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [force, setForce] = useState("");
  async function send(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      await api(`/api/admin/orders/${id}`, { method: "PATCH", body: { ...body, note: note || undefined } });
      toast("Заказ обновлён");
      setNote("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-3 rounded-card bg-white p-5 shadow-card">
      <h2 className="font-bold">Управление заказом</h2>
      <textarea className="textarea min-h-[70px] text-sm" placeholder="Комментарий к изменению (виден в истории)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="grid gap-2">
        {next.map((s) => (
          <button key={s} disabled={!!busy} onClick={() => send({ status: s }, s)} className={cn(s === "CANCELLED" ? "btn-outline" : "btn-primary")}>
            {busy === s && <Loader2 size={16} className="animate-spin" />}
            {s === "CANCELLED" ? "Отменить заказ" : s === "RETURNED" ? "Подтвердить возврат" : `→ ${ORDER_STATUS_LABELS[s]}`}
          </button>
        ))}
        {!next.length && <p className="text-sm text-ink-500">Заказ в финальном статусе.</p>}
        {note && <button disabled={!!busy} onClick={() => send({}, "note")} className="btn-ghost">Добавить только комментарий</button>}
      </div>
      <div className="border-t border-ink-100 pt-3">
        <label className="label">Установить любой статус</label>
        <div className="flex gap-2">
          <select className="input h-10 text-sm" value={force} onChange={(e) => setForce(e.target.value)}>
            <option value="">—</option>
            {Object.entries(ORDER_STATUS_LABELS).filter(([k]) => k !== status).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button className="btn-dark h-10" disabled={!force || !!busy} onClick={() => send({ status: force }, "force")}>OK</button>
        </div>
      </div>
      <div className="border-t border-ink-100 pt-3">
        <label className="label">Статус оплаты</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[["pending", "Ожидает"], ["paid", "Оплачен"], ["refunded", "Возврат"]].map(([k, l]) => (
            <button key={k} onClick={() => send({ paymentStatus: k }, "pay" + k)} className={cn("rounded-lg border-2 py-2 text-xs font-semibold", paymentStatus === k ? "border-brand bg-brand-50 text-brand" : "border-ink-100")}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
