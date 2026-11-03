"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/client-api";

type S = { status: string; orderNumber?: number; orderId?: string | null; error?: string | null };

export function PaymentResult({ paymentId }: { paymentId: string }) {
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let stop = false;
    let n = 0;
    const tick = async () => {
      try {
        const r = await api<S>(`/api/payments/${paymentId}/status`);
        if (stop) return;
        setS(r);
        if (r.status === "PENDING" && n++ < 20) setTimeout(tick, 3000);
      } catch (e) {
        setErr((e as Error).message);
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [paymentId]);

  async function retry() {
    setRetrying(true);
    try {
      const r = await api<{ redirectUrl: string | null }>(`/api/payments/${paymentId}/status`, { method: "POST" });
      if (r.redirectUrl) window.location.assign(r.redirectUrl);
    } catch (e) {
      setErr((e as Error).message);
      setRetrying(false);
    }
  }

  const ok = s?.status === "SUCCEEDED";
  const failed = s?.status === "CANCELED";
  return (
    <div className="container-tm py-16">
      <div className="mx-auto max-w-lg animate-fade-up text-center">
        {!s && !err ? <Loader2 size={56} className="mx-auto animate-spin text-brand" /> : ok ? <CheckCircle2 size={72} className="mx-auto text-brand" strokeWidth={1.5} /> : failed || err ? <XCircle size={72} className="mx-auto text-ink-400" strokeWidth={1.5} /> : <Clock size={72} className="mx-auto text-brand" strokeWidth={1.5} />}
        <h1 className="mt-5 text-3xl font-extrabold">{err ? "Платёж не найден" : !s ? "Проверяем оплату…" : ok ? "Оплата прошла успешно" : failed ? "Оплата не прошла" : "Ожидаем подтверждения банка"}</h1>
        {s?.orderNumber && <p className="mt-3 text-lg">Заказ <b>№{s.orderNumber}</b></p>}
        <p className="mt-2 text-ink-500">{ok ? "Спасибо! Мы начали собирать ваш заказ." : failed ? s?.error || "Попробуйте ещё раз или выберите другой способ оплаты." : s ? "Обычно это занимает несколько секунд. Страница обновится автоматически." : err}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {failed && <button onClick={retry} disabled={retrying} className="btn-primary btn-lg">{retrying && <Loader2 size={18} className="animate-spin" />}Оплатить снова</button>}
          {s?.orderId && <Link href={`/account/orders/${s.orderId}`} className={ok ? "btn-primary btn-lg" : "btn-outline btn-lg"}>Открыть заказ</Link>}
          <Link href="/catalog" className="btn-outline btn-lg">Продолжить покупки</Link>
        </div>
      </div>
    </div>
  );
}
