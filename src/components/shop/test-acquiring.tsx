"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { PaymentIcon } from "./payment-picker";
import { api } from "@/lib/client-api";
import { creditMonthly, luhnValid, methodDef } from "@/lib/payment-methods";
import { cn, formatPrice } from "@/lib/utils";

function fakeQr(seed: string) {
  // decorative QR-like pattern (test mode only)
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < 25 * 25; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >> 16) % 2 === 0);
  }
  return cells;
}

export function TestAcquiring({ payment, installmentParts, creditMonths, creditRate }: { payment: { id: string; method: string; amount: number; status: string; orderNumber: number }; installmentParts: number; creditMonths: number; creditRate: number }) {
  const router = useRouter();
  const def = methodDef(payment.method);
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const isCard = ["card", "mirpay", "wallet"].includes(payment.method);

  async function act(action: "pay" | "fail") {
    setErr("");
    if (action === "pay" && isCard && !luhnValid(card)) return setErr("Проверьте номер карты");
    setBusy(action);
    try {
      await api(`/api/payments/${payment.id}/test`, { body: { action, card, exp, cvc } });
      router.push(`/pay/return?p=${payment.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy("");
    }
  }

  useEffect(() => {
    if (payment.status !== "PENDING") router.replace(`/pay/return?p=${payment.id}`);
  }, [payment.status, payment.id, router]);
  if (payment.status !== "PENDING") return null;

  const qr = fakeQr(payment.id);
  return (
    <div className="container-tm py-8">
      <div className="mx-auto max-w-md animate-fade-up overflow-hidden rounded-3xl border border-ink-100 shadow-lift">
        <div className="bg-ink p-5 text-white">
          <div className="flex items-center justify-between text-sm text-white/60"><span>TECHMARKET · заказ №{payment.orderNumber}</span><Lock size={14} /></div>
          <div className="mt-2 text-3xl font-extrabold">{formatPrice(payment.amount)}</div>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/80">{def && <PaymentIcon icon={def.icon} size={16} />}{def?.label}</div>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand"><ShieldCheck size={16} className="shrink-0" />Тестовый режим платёжной системы: деньги не списываются. Подключите ЮKassa или Т-Банк в админке, чтобы принимать реальные платежи.</div>

          {isCard && (
            <div className="space-y-3">
              <div><label className="label">Номер карты</label><input className="input font-mono tracking-wider" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card} onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Срок</label><input className="input font-mono" inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ" value={exp} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setExp(d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d); }} /></div>
                <div><label className="label">CVC</label><input className="input font-mono" inputMode="numeric" autoComplete="cc-csc" type="password" placeholder="•••" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
              </div>
              <p className="text-xs text-ink-500">Тестовые карты: 4242 4242 4242 4242 — успешно, 4000 0000 0000 0002 — отказ банка. Любой будущий срок и CVC.</p>
            </div>
          )}
          {payment.method === "sbp" && (
            <div className="text-center">
              <div className="mx-auto grid w-48 grid-cols-[repeat(25,1fr)] gap-0 rounded-xl border border-ink-100 bg-white p-3" aria-label="QR-код СБП (тест)">
                {qr.map((on, i) => <span key={i} className={cn("aspect-square", on ? "bg-ink" : "bg-white")} />)}
              </div>
              <p className="mt-2 text-sm text-ink-500">Отсканируйте QR-код в приложении банка</p>
            </div>
          )}
          {["sberpay", "tpay", "yoomoney"].includes(payment.method) && (
            <div className="flex items-center gap-3 rounded-xl border border-ink-100 p-4"><Smartphone className="text-brand" /><div className="text-sm">Мы отправили запрос в приложение <b>{def?.label}</b>. Подтвердите платёж.</div></div>
          )}
          {payment.method === "installments" && (
            <div className="space-y-2 rounded-xl border border-ink-100 p-4 text-sm">
              <div className="font-semibold">График платежей без переплаты</div>
              {Array.from({ length: installmentParts }).map((_, i) => (
                <div key={i} className="flex justify-between"><span className="text-ink-500">{i === 0 ? "Сегодня" : `Через ${i * 2} нед.`}</span><b>{formatPrice(Math.ceil(payment.amount / installmentParts))}</b></div>
              ))}
            </div>
          )}
          {payment.method === "credit" && (
            <div className="space-y-1 rounded-xl border border-ink-100 p-4 text-sm">
              <div className="font-semibold">Заявка на кредит</div>
              <div className="flex justify-between"><span className="text-ink-500">Срок</span><b>{creditMonths} мес.</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Ставка</span><b>{creditRate}% годовых</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Ежемесячный платёж</span><b>{formatPrice(creditMonthly(payment.amount, creditMonths, creditRate))}</b></div>
            </div>
          )}

          {err && <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm font-medium">{err}</div>}
          <button className="btn-primary btn-lg w-full" disabled={!!busy} onClick={() => act("pay")}>
            {busy === "pay" ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
            {payment.method === "credit" ? "Отправить заявку и оплатить" : payment.method === "sbp" ? "Я оплатил(а)" : `Оплатить ${formatPrice(payment.amount)}`}
          </button>
          <button className="btn-ghost w-full" disabled={!!busy} onClick={() => act("fail")}>Отменить оплату</button>
        </div>
      </div>
    </div>
  );
}
