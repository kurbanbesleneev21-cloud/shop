"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SellerRegisterForm({ rejected }: { rejected?: boolean }) {
  const { toast, refreshUser } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ shopName: "", legalName: "", inn: "", phone: "", description: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 rounded-card border border-ink-100 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await api<{ status: string }>("/api/seller/register", { body: f });
          toast(r.status === "APPROVED" ? "Магазин подключён!" : "Заявка отправлена на модерацию");
          await refreshUser();
          router.push(r.status === "APPROVED" ? "/seller" : "/seller/register");
          router.refresh();
        } catch (er) {
          toast((er as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {rejected && <p className="rounded-xl bg-ink-50 p-3 text-sm">Предыдущая заявка была отклонена. Вы можете подать новую.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Название магазина *</label><input className="input" required value={f.shopName} onChange={(e) => setF({ ...f, shopName: e.target.value })} /></div>
        <div><label className="label">Юридическое название</label><input className="input" value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} placeholder="ООО «Техника»" /></div>
        <div><label className="label">ИНН</label><input className="input" inputMode="numeric" value={f.inn} onChange={(e) => setF({ ...f, inn: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></div>
        <div><label className="label">Телефон</label><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      </div>
      <div><label className="label">О магазине</label><textarea className="textarea" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Отправить заявку</button>
    </form>
  );
}
