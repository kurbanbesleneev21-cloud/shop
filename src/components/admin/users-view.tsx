"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { useApp } from "../providers";
import { Drawer } from "./sellers-view";
import { F, Toggle } from "./product-editor";
import { StatusBadge } from "../shop/order-bits";
import { api } from "@/lib/client-api";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export type UserRow = {
  id: string; name: string; email: string; phone: string | null; role: string; blocked: boolean; blockReason: string | null; emailVerified: boolean; createdAt: string; lastLoginAt: string | null;
  ordersCount: number; spent: number; orders: { id: string; number: number; total: number; status: string; createdAt: string }[]; tickets: { id: string; subject: string; status: string; createdAt: string }[];
};

const ROLE: Record<string, string> = { BUYER: "Покупатель", SELLER: "Продавец", ADMIN: "Администратор" };

export function UsersView({ rows }: { rows: UserRow[] }) {
  const { toast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState<UserRow | null>(null);
  const [f, setF] = useState({ name: "", phone: "", role: "BUYER", blocked: false, blockReason: "" });
  const [busy, setBusy] = useState(false);
  async function save(extra: Record<string, unknown> = {}) {
    if (!open) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${open.id}`, { method: "PATCH", body: { ...f, ...extra } });
      toast("Сохранено");
      setOpen(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="table-tm">
            <thead><tr><th>Пользователь</th><th>Роль</th><th>Регистрация</th><th className="text-right">Заказы</th><th className="text-right">Сумма покупок</th><th>Статус</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="cursor-pointer" onClick={() => { setOpen(u); setF({ name: u.name, phone: u.phone ?? "", role: u.role, blocked: u.blocked, blockReason: u.blockReason ?? "" }); }}>
                  <td><div className="font-semibold">{u.name}</div><div className="text-xs text-ink-500">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div></td>
                  <td className="text-sm">{ROLE[u.role]}</td>
                  <td className="whitespace-nowrap text-ink-500">{formatDate(u.createdAt)}</td>
                  <td className="text-right">{u.ordersCount}</td>
                  <td className="whitespace-nowrap text-right">{formatPrice(u.spent)}</td>
                  <td><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", u.blocked ? "bg-ink text-white" : u.emailVerified ? "bg-brand-50 text-brand" : "bg-ink-100 text-ink-500")}>{u.blocked ? "Заблокирован" : u.emailVerified ? "Подтверждён" : "Email не подтверждён"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-10 text-center text-ink-500">Пользователи не найдены</div>}
      </div>
      <AnimatePresence>
        {open && (
          <Drawer title={open.name} onClose={() => setOpen(null)}>
            <div className="text-sm text-ink-500">{open.email} · зарегистрирован {formatDate(open.createdAt)}{open.lastLoginAt ? ` · последний вход ${formatDate(open.lastLoginAt, true)}` : ""}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Имя"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
              <F label="Телефон"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></F>
              <F label="Роль"><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
            </div>
            <div className="rounded-xl border border-ink-100 p-3">
              <Toggle label="Заблокировать пользователя" value={f.blocked} onChange={(v) => setF({ ...f, blocked: v })} hint="Пользователь будет разлогинен и не сможет войти" />
              {f.blocked && <input className="input mt-2" placeholder="Причина блокировки" value={f.blockReason} onChange={(e) => setF({ ...f, blockReason: e.target.value })} />}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={busy} onClick={() => save()}>Сохранить</button>
              {!open.emailVerified && <button className="btn-outline" disabled={busy} onClick={() => save({ verifyEmail: true })}>Подтвердить email вручную</button>}
              <button className="btn-outline" disabled={busy} onClick={() => save({ logoutEverywhere: true })}>Завершить все сессии</button>
            </div>
            <div>
              <h3 className="mb-2 font-bold">История заказов ({open.ordersCount})</h3>
              {open.orders.length ? (
                <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                  {open.orders.map((o) => <li key={o.id} className="flex items-center gap-3 p-2.5 text-sm"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand">№{o.number}</Link><span className="text-ink-500">{formatDate(o.createdAt)}</span><StatusBadge status={o.status} /><span className="ml-auto font-semibold">{formatPrice(o.total)}</span></li>)}
                </ul>
              ) : <p className="text-sm text-ink-500">Заказов нет</p>}
            </div>
            <div>
              <h3 className="mb-2 font-bold">Обращения в поддержку</h3>
              {open.tickets.length ? <ul className="space-y-1 text-sm">{open.tickets.map((t) => <li key={t.id}><Link href={`/admin/support?q=${encodeURIComponent(open.email)}`} className="hover:text-brand">{t.subject}</Link> <span className="text-ink-500">· {formatDate(t.createdAt)} · {t.status}</span></li>)}</ul> : <p className="text-sm text-ink-500">Обращений нет</p>}
            </div>
          </Drawer>
        )}
      </AnimatePresence>
    </>
  );
}
