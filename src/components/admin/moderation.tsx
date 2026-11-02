"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, MessageSquare, Trash2, X } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import { Stars } from "../shop/stars";

export type ReviewRow = { id: string; rating: number; text: string; pros: string | null; cons: string | null; photos: string[]; status: string; reply: string | null; complaints: number; reasons: string[]; createdAt: string; user: string; product: string; productSlug: string };

export function ReviewsModeration({ rows }: { rows: ReviewRow[] }) {
  const { toast } = useApp();
  const router = useRouter();
  const [reply, setReply] = useState<Record<string, string>>({});
  const call = async (id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>, msg = "Готово") => {
    try {
      await api(`/api/admin/reviews/${id}`, { method, body });
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  if (!rows.length) return <div className="rounded-card bg-white p-10 text-center text-ink-500 shadow-card">Отзывов нет</div>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={r.rating} />
            <b>{r.user}</b>
            <span className="text-xs text-ink-500">{formatDate(r.createdAt, true)}</span>
            <a href={`/product/${r.productSlug}`} target="_blank" className="text-sm text-brand hover:underline">{r.product}</a>
            <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-semibold", r.status === "APPROVED" ? "bg-brand text-white" : r.status === "PENDING" ? "bg-brand-50 text-brand" : "bg-ink-100 text-ink-500")}>{r.status === "APPROVED" ? "Опубликован" : r.status === "PENDING" ? "На модерации" : "Отклонён"}</span>
          </div>
          {r.complaints > 0 && (
            <div className="mt-2 rounded-xl bg-ink-50 p-2.5 text-sm"><b className="inline-flex items-center gap-1"><Flag size={14} />Жалоб: {r.complaints}</b> — {r.reasons.slice(-3).join("; ")}</div>
          )}
          <div className="mt-2 space-y-1 text-sm">
            {r.pros && <p><b>Достоинства:</b> {r.pros}</p>}
            {r.cons && <p><b>Недостатки:</b> {r.cons}</p>}
            <p className="text-ink-700">{r.text}</p>
          </div>
          {r.photos.length > 0 && <div className="mt-2 flex gap-2">{r.photos.map((p) => /* eslint-disable-next-line @next/next/no-img-element */ <a key={p} href={p} target="_blank"><img src={p} alt="" className="h-16 w-16 rounded-lg object-cover" /></a>)}</div>}
          {r.reply && <div className="mt-2 rounded-xl bg-brand-50 p-2.5 text-sm"><b className="text-brand">Ответ магазина:</b> {r.reply}</div>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {r.status !== "APPROVED" && <button className="btn-primary btn-sm" onClick={() => call(r.id, "PATCH", { status: "APPROVED" }, "Отзыв опубликован")}><Check size={15} />Одобрить</button>}
            {r.status !== "REJECTED" && <button className="btn-outline btn-sm" onClick={() => call(r.id, "PATCH", { status: "REJECTED" }, "Отзыв отклонён")}><X size={15} />Отклонить</button>}
            {r.complaints > 0 && <button className="btn-ghost btn-sm" onClick={() => call(r.id, "PATCH", { clearComplaints: true }, "Жалобы обработаны")}>Жалобы обработаны</button>}
            <button className="btn-ghost btn-sm" onClick={() => confirm("Удалить отзыв навсегда?") && call(r.id, "DELETE", undefined, "Отзыв удалён")}><Trash2 size={15} />Удалить</button>
            <div className="flex min-w-[240px] flex-1 gap-2">
              <input className="input h-9 text-sm" placeholder="Ответ на отзыв" value={reply[r.id] ?? ""} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} />
              <button className="btn-soft btn-sm" disabled={!reply[r.id]} onClick={() => call(r.id, "PATCH", { reply: reply[r.id] }, "Ответ опубликован")}><MessageSquare size={15} />Ответить</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type TicketRow = { id: string; name: string; email: string; subject: string; message: string; status: string; reply: string | null; createdAt: string; orderId: string | null };

export function TicketsView({ rows }: { rows: TicketRow[] }) {
  const { toast } = useApp();
  const router = useRouter();
  const [reply, setReply] = useState<Record<string, string>>({});
  const call = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/admin/tickets/${id}`, { method: "PATCH", body });
      toast("Сохранено");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  if (!rows.length) return <div className="rounded-card bg-white p-10 text-center text-ink-500 shadow-card">Обращений нет</div>;
  return (
    <div className="space-y-3">
      {rows.map((t) => (
        <div key={t.id} className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <b>{t.subject}</b>
            <span className="text-sm text-ink-500">{t.name} · {t.email} · {formatDate(t.createdAt, true)}</span>
            {t.orderId && <a href={`/admin/orders/${t.orderId}`} className="text-sm text-brand">заказ</a>}
            <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-semibold", t.status === "OPEN" ? "bg-brand text-white" : t.status === "ANSWERED" ? "bg-brand-50 text-brand" : "bg-ink-100 text-ink-500")}>{t.status === "OPEN" ? "Открыто" : t.status === "ANSWERED" ? "Отвечено" : "Закрыто"}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{t.message}</p>
          {t.reply && <div className="mt-2 rounded-xl bg-brand-50 p-2.5 text-sm"><b className="text-brand">Ответ:</b> {t.reply}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <textarea className="textarea min-h-[60px] flex-1 text-sm" placeholder="Ответ клиенту (отправится на email)" value={reply[t.id] ?? ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} />
            <div className="flex flex-col gap-2">
              <button className="btn-primary btn-sm" disabled={!reply[t.id]} onClick={() => call(t.id, { reply: reply[t.id] })}>Ответить</button>
              {t.status !== "CLOSED" ? <button className="btn-outline btn-sm" onClick={() => call(t.id, { status: "CLOSED" })}>Закрыть</button> : <button className="btn-outline btn-sm" onClick={() => call(t.id, { status: "OPEN" })}>Открыть</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
