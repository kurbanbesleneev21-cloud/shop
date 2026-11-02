"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SellerPayoutForm({ balance }: { balance: number }) {
  const { toast } = useApp();
  const router = useRouter();
  const [amount, setAmount] = useState(String(balance));
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-card border border-ink-100 p-4">
      <div><label className="label">Сумма вывода, ₽</label><input className="input w-48" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></div>
      <button className="btn-primary" disabled={!Number(amount) || Number(amount) > balance} onClick={async () => {
        try { await api("/api/seller/payout", { body: { amount: Number(amount) } }); toast("Запрос на выплату отправлен"); router.refresh(); } catch (e) { toast((e as Error).message, "error"); }
      }}>Запросить выплату</button>
    </div>
  );
}
