"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Trash2, Check, X } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";
import { cn, formatPrice } from "@/lib/utils";

export type Row = { id: string; title: string; slug: string; sku: string; price: number; oldPrice: number | null; stock: number; status: string; image: string | null; category: string; brand: string | null; seller: string | null; salesCount: number };

export function ProductsTable({ rows, base }: { rows: Row[]; base: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string; price: string; oldPrice: string; stock: string } | null>(null);

  async function patch(id: string, body: Record<string, unknown>, msg: string) {
    try {
      const r = await api<{ id?: string }>(`/api/manage/products/${id}`, { method: "PATCH", body });
      toast(msg);
      if (body.action === "duplicate" && r.id) router.push(`${base}/${r.id}`);
      else router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  async function del(id: string, title: string) {
    if (!confirm(`Удалить «${title}»? Это действие необратимо.`)) return;
    try {
      await api(`/api/manage/products/${id}`, { method: "DELETE" });
      toast("Товар удалён");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!rows.length) return <div className="rounded-card bg-white p-10 text-center text-ink-500 shadow-card">Товары не найдены</div>;
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="table-tm">
          <thead><tr><th>Товар</th><th>Категория</th><th className="text-right">Цена</th><th className="text-right">Остаток</th><th>Статус</th><th className="text-right">Действия</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const editing = edit?.id === r.id;
              return (
                <tr key={r.id}>
                  <td className="min-w-[260px]">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-50">{r.image && <img src={r.image} alt="" className="h-full w-full object-contain" loading="lazy" />}</span>
                      <div className="min-w-0">
                        <Link href={`${base}/${r.id}`} className="line-clamp-1 font-semibold hover:text-brand">{r.title}</Link>
                        <div className="text-xs text-ink-500">{r.sku}{r.brand ? ` · ${r.brand}` : ""}{r.seller ? ` · ${r.seller}` : ""} · продано {r.salesCount}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink-600">{r.category}</td>
                  <td className="text-right">
                    {editing ? (
                      <div className="flex flex-col items-end gap-1">
                        <input className="input h-8 w-24 text-right text-sm" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} aria-label="Цена" />
                        <input className="input h-8 w-24 text-right text-sm" value={edit.oldPrice} onChange={(e) => setEdit({ ...edit, oldPrice: e.target.value })} placeholder="старая" aria-label="Старая цена" />
                      </div>
                    ) : (
                      <div className="whitespace-nowrap"><div className="font-semibold">{formatPrice(r.price)}</div>{r.oldPrice && <div className="text-xs text-ink-400 line-through">{formatPrice(r.oldPrice)}</div>}</div>
                    )}
                  </td>
                  <td className="text-right">
                    {editing ? <input className="input h-8 w-20 text-right text-sm" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} aria-label="Остаток" /> : <span className={cn("font-semibold", r.stock <= 3 && "text-brand")}>{r.stock}</span>}
                  </td>
                  <td>
                    <button onClick={() => patch(r.id, { action: "status", status: r.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED" }, r.status === "PUBLISHED" ? "Товар скрыт" : "Товар опубликован")} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition", r.status === "PUBLISHED" ? "bg-brand text-white hover:bg-brand-600" : r.status === "HIDDEN" ? "bg-ink-200 hover:bg-ink-300" : "bg-ink-100 hover:bg-ink-200")} title="Переключить публикацию">
                      {r.status === "PUBLISHED" ? <Eye size={12} /> : <EyeOff size={12} />}
                      {r.status === "PUBLISHED" ? "Опубликован" : r.status === "HIDDEN" ? "Скрыт" : "Черновик"}
                    </button>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {editing ? (
                        <>
                          <IconBtn title="Сохранить" onClick={() => { patch(r.id, { action: "quick", price: Number(edit.price), oldPrice: edit.oldPrice ? Number(edit.oldPrice) : null, stock: Number(edit.stock) }, "Сохранено"); setEdit(null); }}><Check size={16} /></IconBtn>
                          <IconBtn title="Отмена" onClick={() => setEdit(null)}><X size={16} /></IconBtn>
                        </>
                      ) : (
                        <IconBtn title="Быстро изменить цену и остаток" onClick={() => setEdit({ id: r.id, price: String(r.price), oldPrice: r.oldPrice ? String(r.oldPrice) : "", stock: String(r.stock) })}><span className="text-xs font-bold">₽</span></IconBtn>
                      )}
                      <Link href={`${base}/${r.id}`} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-brand-50 hover:text-brand" title="Редактировать"><Pencil size={16} /></Link>
                      <IconBtn title="Копировать" onClick={() => patch(r.id, { action: "duplicate" }, "Создана копия")}><Copy size={16} /></IconBtn>
                      <IconBtn title="Удалить" onClick={() => del(r.id, r.title)}><Trash2 size={16} /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return <button onClick={onClick} title={title} aria-label={title} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-brand-50 hover:text-brand">{children}</button>;
}
