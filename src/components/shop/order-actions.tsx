"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function OrderActions({ id, status }: { id: string; status: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "cancel" | "return") {
    const reason = prompt(action === "cancel" ? "Причина отмены (необязательно)" : "Причина возврата");
    if (reason === null) return;
    setBusy(true);
    try {
      await api(`/api/orders/${id}`, { body: { action, reason } });
      toast(action === "cancel" ? "Заказ отменён" : "Заявка на возврат отправлена");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2">
      {["NEW", "CONFIRMED", "PAID"].includes(status) && <button disabled={busy} onClick={() => act("cancel")} className="btn-outline w-full">Отменить заказ</button>}
      {status === "DELIVERED" && <button disabled={busy} onClick={() => act("return")} className="btn-outline w-full">Оформить возврат</button>}
      <Link href={`/account/support?order=${id}`} className="btn-ghost w-full">Написать в поддержку</Link>
    </div>
  );
}
