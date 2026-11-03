"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, FileText, Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { PAYMENT_METHODS, methodDef } from "@/lib/payment-methods";

export function OrderActions({ id, status, paymentStatus, paymentMethod }: { id: string; status: string; paymentStatus: string; paymentMethod: string }) {
  const { toast, config } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState<null | "cancel" | "return">(null);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState(paymentMethod);
  const def = methodDef(paymentMethod);
  const canPay = status === "NEW" && paymentStatus === "pending" && paymentMethod !== "invoice" && (def?.online || false);
  const onlineMethods = PAYMENT_METHODS.filter((m) => m.online && config.payments.enabled.includes(m.key));

  async function act(action: "cancel" | "return") {
    setBusy(action);
    try {
      await api(`/api/orders/${id}`, { body: { action, reason } });
      toast(action === "cancel" ? "Заказ отменён" : "Заявка на возврат отправлена");
      setDialog(null);
      setReason("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  async function pay() {
    setBusy("pay");
    try {
      const r = await api<{ redirectUrl: string | null }>(`/api/orders/${id}/pay`, { body: { method } });
      if (r.redirectUrl && /^https:\/\//.test(r.redirectUrl)) window.location.assign(r.redirectUrl);
      else if (r.redirectUrl) router.push(r.redirectUrl);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy("");
    }
  }

  return (
    <div className="grid gap-2">
      {canPay && (
        <div className="space-y-2 rounded-card border-2 border-brand-200 bg-brand-50 p-3">
          <div className="text-sm font-semibold">Заказ ожидает оплаты</div>
          <select className="input h-10 text-sm" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Способ оплаты">
            {onlineMethods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button disabled={!!busy} onClick={pay} className="btn-primary w-full">{busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}Оплатить</button>
        </div>
      )}
      {paymentMethod === "invoice" && <Link href={`/pay/invoice/${id}`} className="btn-outline w-full"><FileText size={16} />Счёт на оплату</Link>}
      {["NEW", "CONFIRMED", "PAID"].includes(status) && <button disabled={!!busy} onClick={() => setDialog(dialog === "cancel" ? null : "cancel")} className="btn-outline w-full">Отменить заказ</button>}
      {status === "DELIVERED" && <button disabled={!!busy} onClick={() => setDialog(dialog === "return" ? null : "return")} className="btn-outline w-full">Оформить возврат</button>}
      {dialog && (
        <div className="space-y-2 rounded-card border border-ink-200 p-3">
          <label className="label">{dialog === "cancel" ? "Причина отмены (необязательно)" : "Причина возврата"}</label>
          <textarea className="textarea min-h-[70px] text-sm" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          {dialog === "cancel" && paymentStatus === "paid" && <p className="text-xs text-ink-500">Деньги вернутся тем же способом, которым был оплачен заказ.</p>}
          <button disabled={!!busy || (dialog === "return" && reason.trim().length < 3)} onClick={() => act(dialog)} className="btn-dark w-full">{busy === dialog && <Loader2 size={16} className="animate-spin" />}{dialog === "cancel" ? "Подтвердить отмену" : "Отправить заявку"}</button>
        </div>
      )}
      <Link href={`/account/support?order=${id}`} className="btn-ghost w-full">Написать в поддержку</Link>
    </div>
  );
}
