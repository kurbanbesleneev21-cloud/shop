"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SupportForm({ orderId }: { orderId?: string }) {
  const { user, toast } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", subject: orderId ? "Вопрос по заказу" : "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <div className="flex items-center gap-3 rounded-card bg-brand-50 p-5"><CheckCircle2 className="text-brand" /> Обращение отправлено. Ответим на {f.email} в ближайшее время.</div>;
  return (
    <form
      className="space-y-3 rounded-card border border-ink-100 p-4 sm:p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/support", { body: { ...f, orderId } });
          setDone(true);
          router.refresh();
        } catch (er) {
          toast((er as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Имя</label><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="input" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div><label className="label">Тема</label><input className="input" required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
      <div><label className="label">Сообщение</label><textarea className="textarea" required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
      <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Отправить</button>
    </form>
  );
}
