"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { ImageUploader } from "../ui/image-uploader";
import { api } from "@/lib/client-api";

type Form = { shopName: string; description: string; logo: string; legalName: string; inn: string; phone: string; email: string; address: string; bankName: string; bik: string; bankAccount: string; returnPolicy: string };

export function SellerSettingsForm({ initial, commission }: { initial: Form; commission: number | null }) {
  const { toast } = useApp();
  const router = useRouter();
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const field = (k: keyof Form, label: string, opts: { placeholder?: string; numeric?: boolean; max?: number } = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={f[k]} placeholder={opts.placeholder} inputMode={opts.numeric ? "numeric" : undefined} onChange={(e) => setF({ ...f, [k]: opts.numeric ? e.target.value.replace(/\D/g, "").slice(0, opts.max) : e.target.value })} />
    </div>
  );
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/seller/profile", { method: "PATCH", body: f });
          toast("Настройки магазина сохранены");
          router.refresh();
        } catch (er) {
          toast((er as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className="space-y-3 rounded-card border border-ink-100 p-4 sm:p-5">
        <h3 className="font-bold">Витрина</h3>
        <div className="grid gap-3 sm:grid-cols-2">{field("shopName", "Название магазина")}{field("email", "Email для покупателей")}{field("phone", "Телефон")}{field("address", "Адрес склада / самовывоза")}</div>
        <div><label className="label">О магазине</label><textarea className="textarea" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2000} /></div>
        <div><label className="label">Условия возврата</label><textarea className="textarea min-h-[70px]" value={f.returnPolicy} onChange={(e) => setF({ ...f, returnPolicy: e.target.value })} maxLength={2000} placeholder="Например: возврат 14 дней, товар в оригинальной упаковке" /></div>
        <div><label className="label">Логотип</label><ImageUploader value={f.logo ? [f.logo] : []} onChange={(v) => setF({ ...f, logo: v[v.length - 1] ?? "" })} max={1} purpose="product" label="Загрузить логотип" /></div>
      </section>
      <section className="space-y-3 rounded-card border border-ink-100 p-4 sm:p-5">
        <h3 className="font-bold">Юридические данные и реквизиты для выплат</h3>
        <p className="text-sm text-ink-500">Комиссия маркетплейса: {commission ?? "по умолчанию"}%. Выплаты возможны после заполнения ИНН и банковских реквизитов.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("legalName", "Юридическое название", { placeholder: "ООО «Техника» / ИП Иванов И. И." })}
          {field("inn", "ИНН", { numeric: true, max: 12 })}
          {field("bankName", "Банк")}
          {field("bik", "БИК", { numeric: true, max: 9 })}
          <div className="sm:col-span-2">{field("bankAccount", "Расчётный счёт", { numeric: true, max: 20 })}</div>
        </div>
      </section>
      <button className="btn-primary btn-lg" disabled={busy}>{busy && <Loader2 size={18} className="animate-spin" />}Сохранить</button>
    </form>
  );
}
