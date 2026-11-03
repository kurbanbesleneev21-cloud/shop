"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatPrice } from "@/lib/utils";

export function KaspiPay({ payment, link, qr, tenge, instructions }: { payment: { id: string; amount: number; status: string; orderNumber: number; orderId: string | null }; link: string; qr: string; tenge: number; instructions: string }) {
  const [status, setStatus] = useState(payment.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tengeStr = tenge ? new Intl.NumberFormat("ru-RU").format(tenge) + " ₸" : "";
  return (
    <div className="container-tm py-8">
      <div className="mx-auto max-w-md animate-fade-up overflow-hidden rounded-3xl border border-ink-100 shadow-lift">
        <div className="bg-ink p-5 text-white">
          <div className="text-sm text-white/60">TECHMARKET · заказ №{payment.orderNumber}</div>
          <div className="mt-2 text-3xl font-extrabold">{formatPrice(payment.amount)}</div>
          {tengeStr && <div className="mt-1 text-sm text-white/80">к оплате в Kaspi: <b>{tengeStr}</b></div>}
          <div className="mt-1 text-sm text-white/80">Kaspi Pay</div>
        </div>
        <div className="space-y-4 p-5">
          {status === "SUCCEEDED" ? (
            <div className="text-center"><CheckCircle2 size={56} className="mx-auto text-brand" /><p className="mt-2 font-bold">Оплата подтверждена</p></div>
          ) : status === "WAITING" ? (
            <div className="text-center"><Clock size={56} className="mx-auto text-brand" /><p className="mt-2 font-bold">Проверяем поступление оплаты</p><p className="mt-1 text-sm text-ink-500">Обычно это занимает несколько минут в рабочее время. Мы сообщим, когда заказ будет подтверждён.</p></div>
          ) : (
            <>
              <p className="text-sm text-ink-600">{instructions}</p>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR-код Kaspi" className="mx-auto h-56 w-56 rounded-xl border border-ink-100 object-contain" />
              )}
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="btn-primary btn-lg w-full"><ExternalLink size={18} />Оплатить в Kaspi</a>
              ) : !qr ? (
                <p className="rounded-xl bg-ink-50 p-3 text-sm">Реквизиты Kaspi ещё не настроены магазином. Свяжитесь с поддержкой.</p>
              ) : null}
              <p className="text-xs text-ink-500">Укажите в комментарии к платежу: «Заказ №{payment.orderNumber}».</p>
              {err && <p className="text-sm font-medium">{err}</p>}
              <button
                className="btn-dark w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await api<{ status: string }>(`/api/payments/${payment.id}/kaspi`, { method: "POST" });
                    setStatus(r.status);
                  } catch (e) {
                    setErr((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}Я оплатил(а)
              </button>
            </>
          )}
          {payment.orderId && <Link href={`/account/orders/${payment.orderId}`} className="btn-ghost w-full">Открыть заказ</Link>}
        </div>
      </div>
    </div>
  );
}
