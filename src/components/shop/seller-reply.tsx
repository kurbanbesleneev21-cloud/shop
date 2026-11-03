"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SellerReplyForm({ id, initial }: { id: string; initial: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [edit, setEdit] = useState(!initial);
  if (!edit) return <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm"><b className="text-brand">Ваш ответ:</b> {initial} <button onClick={() => setEdit(true)} className="ml-2 text-xs font-semibold text-brand">Изменить</button></div>;
  return (
    <div className="mt-3 flex gap-2">
      <textarea className="textarea min-h-[44px] text-sm" placeholder="Ответить покупателю" value={v} onChange={(e) => setV(e.target.value)} maxLength={2000} />
      <button className="btn-primary btn-sm self-end" disabled={v.trim().length < 2} onClick={async () => {
        try { await api(`/api/seller/reviews/${id}`, { body: { reply: v } }); toast("Ответ опубликован"); setEdit(false); router.refresh(); } catch (e) { toast((e as Error).message, "error"); }
      }}>Ответить</button>
    </div>
  );
}
