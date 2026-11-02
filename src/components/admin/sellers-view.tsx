"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Check, Loader2, Package, Plus, ShoppingBag, Wallet, X, Unlock } from "lucide-react";
import { useApp } from "../providers";
import { F } from "./product-editor";
import { api } from "@/lib/client-api";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export type SellerRow = {
  id: string; shopName: string; slug: string; status: string; description: string | null; legalName: string | null; inn: string | null; phone: string | null; email: string | null;
  commissionRate: number | null; createdAt: string; userEmail: string; userName: string;
  fin: { turnover: number; commission: number; delivered: number; paid: number; pending: number; balance: number; orders: number; products: number };
};

const ST: Record<string, [string, string]> = { PENDING: ["Заявка", "bg-brand-50 text-brand"], APPROVED: ["Активен", "bg-brand text-white"], REJECTED: ["Отклонён", "bg-ink-100 text-ink-500"], BLOCKED: ["Заблокирован", "bg-ink text-white"] };

export function SellersView({ rows, defaultRate }: { rows: SellerRow[]; defaultRate: number }) {
  const { toast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState<SellerRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [newS, setNewS] = useState({ email: "", name: "", shopName: "", inn: "", commissionRate: "" });
  const [payout, setPayout] = useState("");

  const openRow = (r: SellerRow) => {
    setOpen(r);
    setForm({ shopName: r.shopName, description: r.description ?? "", legalName: r.legalName ?? "", inn: r.inn ?? "", phone: r.phone ?? "", email: r.email ?? "", commissionRate: r.commissionRate == null ? "" : String(r.commissionRate) });
    setPayout(String(Math.max(0, r.fin.balance)));
  };
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!open) return;
    setBusy(action);
    try {
      await api(`/api/admin/sellers/${open.id}`, { method: "PATCH", body: { action, ...extra } });
      toast("Сохранено");
      router.refresh();
      if (action !== "update") setOpen(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end"><button className="btn-primary" onClick={() => setCreating(true)}><Plus size={18} />Зарегистрировать продавца</button></div>
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="table-tm">
            <thead><tr><th>Магазин</th><th>Статус</th><th className="text-right">Товары</th><th className="text-right">Заказы</th><th className="text-right">Оборот</th><th className="text-right">Комиссия</th><th className="text-right">К выплате</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => openRow(r)}>
                  <td><div className="font-semibold">{r.shopName}</div><div className="text-xs text-ink-500">{r.userEmail} · с {formatDate(r.createdAt)}</div></td>
                  <td><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", ST[r.status]?.[1])}>{ST[r.status]?.[0]}</span></td>
                  <td className="text-right">{r.fin.products}</td>
                  <td className="text-right">{r.fin.orders}</td>
                  <td className="whitespace-nowrap text-right">{formatPrice(r.fin.turnover)}</td>
                  <td className="whitespace-nowrap text-right text-ink-500">{r.commissionRate ?? defaultRate}% · {formatPrice(r.fin.commission)}</td>
                  <td className="whitespace-nowrap text-right font-semibold">{formatPrice(r.fin.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-10 text-center text-ink-500">Продавцов нет</div>}
      </div>

      <AnimatePresence>
        {open && (
          <Drawer title={open.shopName} onClose={() => setOpen(null)}>
            <div className="flex flex-wrap gap-2">
              {open.status === "PENDING" && <><button className="btn-primary" onClick={() => act("approve")} disabled={!!busy}><Check size={16} />Одобрить</button><button className="btn-outline" onClick={() => act("reject")} disabled={!!busy}><X size={16} />Отклонить</button></>}
              {open.status === "APPROVED" && <button className="btn-dark" onClick={() => confirm("Заблокировать продавца? Его товары будут скрыты.") && act("block")} disabled={!!busy}><Ban size={16} />Заблокировать</button>}
              {(open.status === "BLOCKED" || open.status === "REJECTED") && <button className="btn-primary" onClick={() => act("unblock")} disabled={!!busy}><Unlock size={16} />Разблокировать / одобрить</button>}
              <Link href={`/admin/products?seller=${open.id}`} className="btn-outline"><Package size={16} />Товары</Link>
              <Link href={`/admin/orders?seller=${open.id}`} className="btn-outline"><ShoppingBag size={16} />Заказы</Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[["Оборот", open.fin.turnover], ["Комиссия маркетплейса", open.fin.commission], ["Доставлено", open.fin.delivered], ["Выплачено", open.fin.paid], ["В обработке", open.fin.pending], ["Доступно к выплате", open.fin.balance]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-ink-50 p-3"><div className="text-xs text-ink-500">{l}</div><div className="font-bold">{formatPrice(v as number)}</div></div>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-xl border border-ink-100 p-3">
              <F label="Выплата продавцу, ₽"><input className="input" value={payout} onChange={(e) => setPayout(e.target.value.replace(/\D/g, ""))} /></F>
              <button className="btn-primary" disabled={!Number(payout) || !!busy} onClick={async () => {
                setBusy("payout");
                try { await api("/api/admin/payouts", { body: { sellerId: open.id, amount: Number(payout), note: "Выплата из админ-панели" } }); toast("Выплата проведена"); router.refresh(); setOpen(null); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(""); }
              }}><Wallet size={16} />Выплатить</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Название магазина"><input className="input" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></F>
              <F label={`Комиссия, % (пусто — ${defaultRate}% по умолчанию)`}><input className="input" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} /></F>
              <F label="Юр. название"><input className="input" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></F>
              <F label="ИНН"><input className="input" value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} /></F>
              <F label="Телефон"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
              <F label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
            </div>
            <F label="Описание"><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
            <button className="btn-primary" onClick={() => act("update", { ...form, commissionRate: form.commissionRate === "" ? "" : Number(form.commissionRate) })} disabled={!!busy}>{busy === "update" && <Loader2 size={16} className="animate-spin" />}Сохранить профиль</button>
          </Drawer>
        )}
        {creating && (
          <Drawer title="Регистрация продавца" onClose={() => setCreating(false)}>
            <p className="text-sm text-ink-500">Если пользователя с таким email нет — будет создан аккаунт с временным паролем.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Email владельца"><input className="input" value={newS.email} onChange={(e) => setNewS({ ...newS, email: e.target.value })} /></F>
              <F label="Имя владельца"><input className="input" value={newS.name} onChange={(e) => setNewS({ ...newS, name: e.target.value })} /></F>
              <F label="Название магазина"><input className="input" value={newS.shopName} onChange={(e) => setNewS({ ...newS, shopName: e.target.value })} /></F>
              <F label="ИНН"><input className="input" value={newS.inn} onChange={(e) => setNewS({ ...newS, inn: e.target.value })} /></F>
              <F label="Комиссия, %"><input className="input" value={newS.commissionRate} onChange={(e) => setNewS({ ...newS, commissionRate: e.target.value })} /></F>
            </div>
            <button className="btn-primary" disabled={!!busy} onClick={async () => {
              setBusy("create");
              try {
                const r = await api<{ tempPassword?: string }>("/api/admin/sellers", { body: newS });
                if (r.tempPassword) alert(`Продавец создан. Временный пароль: ${r.tempPassword}\nПередайте его владельцу магазина.`);
                toast("Продавец зарегистрирован");
                setCreating(false);
                router.refresh();
              } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(""); }
            }}>Зарегистрировать</button>
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-ink-100 p-4"><span className="text-lg font-bold">{title}</span><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть"><X /></button></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}
