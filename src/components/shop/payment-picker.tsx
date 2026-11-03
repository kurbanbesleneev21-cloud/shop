"use client";

import { Bitcoin, CreditCard, Globe, QrCode, Wallet, Landmark } from "lucide-react";
import { PAYMENT_GROUP_LABELS, PAYMENT_METHODS, type PaymentGroup } from "@/lib/payment-methods";
import type { PublicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";

const ICONS = { sbp: QrCode, card: CreditCard, globe: Globe, crypto: Bitcoin, kaspi: Wallet } as const;

export function PaymentIcon({ icon, size = 22, className }: { icon: keyof typeof ICONS; size?: number; className?: string }) {
  const I = ICONS[icon] ?? Landmark;
  return <I size={size} className={className} />;
}

export function PaymentPicker({ value, onChange, total, cfg }: { value: string; onChange: (k: string) => void; total: number; cfg: PublicConfig["payments"]; currency?: string }) {
  const available = PAYMENT_METHODS.filter((m) => cfg.enabled.includes(m.key));
  const groups = (Object.keys(PAYMENT_GROUP_LABELS) as PaymentGroup[]).map((g) => ({ g, items: available.filter((m) => m.group === g) })).filter((x) => x.items.length);
  const hint = (key: string) => (key === "kaspi" && cfg.kaspiRate > 0 ? `≈ ${new Intl.NumberFormat("ru-RU").format(Math.ceil(total * cfg.kaspiRate))} ₸` : "");
  if (!available.length) return <p className="rounded-xl bg-ink-50 p-3 text-sm">Способы оплаты временно недоступны.</p>;
  return (
    <div className="space-y-4">
      {groups.map(({ g, items }) => (
        <div key={g}>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">{PAYMENT_GROUP_LABELS[g]}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
            {items.map((m) => {
              const active = value === m.key;
              return (
                <button type="button" key={m.key} role="radio" aria-checked={active} onClick={() => onChange(m.key)} className={cn("flex min-h-[92px] flex-col items-start gap-1 rounded-card border-2 p-3 text-left transition", active ? "border-brand bg-brand-50" : "border-ink-100 hover:border-ink-300")}>
                  <PaymentIcon icon={m.icon} className={active ? "text-brand" : "text-ink-500"} />
                  <span className={cn("text-sm font-semibold leading-tight", active && "text-brand")}>{m.label}</span>
                  <span className="text-[11px] leading-snug text-ink-500">{hint(m.key) || m.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
