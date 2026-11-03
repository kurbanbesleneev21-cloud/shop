"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { ORDER_STATUS_LABELS, cn } from "@/lib/utils";

export function OrderAdminActions({ id, status, next, paymentStatus, tracking, total }: { id: string; status: string; next: string[]; paymentStatus: string; tracking?: string | null; total?: number }) {
  const { toast } = useApp();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [force, setForce] = useState("");
  const [track, setTrack] = useState(tracking ?? "");
  const [refundSum, setRefundSum] = useState(String(total ?? ""));
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
      <div className="space-y-2 border-t border-ink-100 pt-3">
        <label className="label">Оплата: <span className={cn("font-bold", paymentStatus === "paid" ? "text-brand" : "")}>{paymentStatus === "paid" ? "оплачен" : paymentStatus === "refunded" ? "деньги возвращены" : "ожидает оплаты"}</span></label>
        {paymentStatus === "pending" && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => send({ action: "confirmPayment" }, "confirm")}>Подтвердить оплату</button>
            <button className="btn-outline btn-sm" disabled={!!busy} onClick={() => send({ action: "syncPayment" }, "sync")}>Проверить у банка</button>
          </div>
        )}
        {paymentStatus === "paid" && (
          <div className="flex gap-2">
            <input className="input h-9 text-sm" inputMode="numeric" value={refundSum} onChange={(e) => setRefundSum(e.target.value.replace(/\D/g, ""))} aria-label="Сумма возврата" />
            <button className="btn-dark btn-sm shrink-0" disabled={!!busy || !Number(refundSum)} onClick={() => confirm(`Вернуть покупателю ${refundSum} ₽?`) && send({ action: "refund", amount: Number(refundSum) }, "refund")}>Вернуть деньги</button>
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-ink-100 pt-3">
        <label className="label">Трек-номер отправления</label>
        <div className="flex gap-2">
          <input className="input h-9 text-sm" value={track} onChange={(e) => setTrack(e.target.value)} placeholder="RA123456789RU" />
          <button className="btn-outline btn-sm shrink-0" disabled={!!busy} onClick={() => send({ action: "tracking", trackingNumber: track }, "track")}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
