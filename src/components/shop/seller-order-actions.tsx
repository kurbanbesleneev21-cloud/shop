"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SellerOrderActions({ id, status, needsTracking = true, paid = true }: { id: string; status: string; needsTracking?: boolean; paid?: boolean }) {
  const { toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [track, setTrack] = useState("");
  const [reason, setReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const go = async (s: string, extra: Record<string, unknown> = {}) => {
    setBusy(s);
    try {
      await api(`/api/seller/orders/${id}`, { method: "PATCH", body: { status: s, ...extra } });
      toast("Статус обновлён");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };
  const canShip = ["NEW", "CONFIRMED", "PAID"].includes(status);
  return (
    <div className="space-y-3 rounded-card border-2 border-brand-100 p-4">
      <h3 className="font-bold">Действия</h3>
      {status === "NEW" && <button className="btn-outline w-full" disabled={!!busy} onClick={() => go("CONFIRMED")}>{busy === "CONFIRMED" && <Loader2 size={16} className="animate-spin" />}Подтвердить заказ</button>}
      {canShip && (
        <div className="space-y-2">
          {!paid && <p className="rounded-lg bg-ink-50 p-2 text-xs">Покупатель ещё не оплатил заказ — отгрузка станет доступна после оплаты.</p>}
          {needsTracking && <input className="input h-10 text-sm" placeholder="Трек-номер отправления" value={track} onChange={(e) => setTrack(e.target.value)} />}
          <button className="btn-primary w-full" disabled={!!busy || !paid || (needsTracking && !track.trim())} onClick={() => go("SHIPPED", { trackingNumber: track.trim() || undefined })}>{busy === "SHIPPED" && <Loader2 size={16} className="animate-spin" />}Передать в доставку</button>
        </div>
      )}
      {status === "SHIPPED" && <button className="btn-primary w-full" disabled={!!busy} onClick={() => go("DELIVERED")}>Подтвердить вручение</button>}
      {status === "RETURN_REQUESTED" && <button className="btn-primary w-full" disabled={!!busy} onClick={() => go("RETURNED")}>Принять возврат и вернуть деньги</button>}
      {canShip && (
        <>
          <button className="btn-ghost w-full" onClick={() => setCancelOpen((v) => !v)}>Отменить заказ</button>
          {cancelOpen && (
            <div className="space-y-2">
              <textarea className="textarea min-h-[60px] text-sm" placeholder="Причина отмены (обязательно)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn-dark w-full" disabled={!!busy || reason.trim().length < 3} onClick={() => go("CANCELLED", { reason: reason.trim() })}>Подтвердить отмену</button>
              <p className="text-xs text-ink-500">Товар вернётся на склад, оплаченный заказ будет возвращён покупателю.</p>
            </div>
          )}
        </>
      )}
      {["DELIVERED", "CANCELLED", "RETURNED"].includes(status) && <p className="text-sm text-ink-500">Заказ завершён.</p>}
    </div>
  );
}
