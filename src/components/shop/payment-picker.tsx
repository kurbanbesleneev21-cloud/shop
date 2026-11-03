"use client";

import { Banknote, Building2, CalendarClock, CreditCard, Landmark, QrCode, Smartphone, Wallet, PieChart, Nfc } from "lucide-react";
import { PAYMENT_GROUP_LABELS, PAYMENT_METHODS, creditMonthly, type PaymentGroup } from "@/lib/payment-methods";
import type { PublicConfig } from "@/lib/public-config";
import { cn, formatPrice } from "@/lib/utils";

const ICONS = { card: CreditCard, sbp: QrCode, sber: Smartphone, tpay: Smartphone, yoomoney: Wallet, mir: Nfc, wallet: Smartphone, parts: PieChart, credit: CalendarClock, cash: Banknote, pos: CreditCard, invoice: Building2 } as const;

export function PaymentIcon({ icon, size = 22, className }: { icon: keyof typeof ICONS; size?: number; className?: string }) {
  const I = ICONS[icon] ?? Landmark;
  return <I size={size} className={className} />;
}

export function PaymentPicker({ value, onChange, total, cfg, currency }: { value: string; onChange: (k: string) => void; total: number; cfg: PublicConfig["payments"]; currency: string }) {
  const available = PAYMENT_METHODS.filter((m) => cfg.enabled.includes(m.key));
  const groups = (Object.keys(PAYMENT_GROUP_LABELS) as PaymentGroup[]).map((g) => ({ g, items: available.filter((m) => m.group === g) })).filter((x) => x.items.length);
  const disabledReason = (key: string) => {
    if ((key === "installments" || key === "credit") && total < cfg.creditMinAmount) return `от ${formatPrice(cfg.creditMinAmount, currency)}`;
    if ((key === "cash" || key === "card_on_delivery") && cfg.cashMaxAmount > 0 && total > cfg.cashMaxAmount) return `до ${formatPrice(cfg.cashMaxAmount, currency)}`;
    return "";
  };
  const hint = (key: string) => {
    if (key === "installments") return `${cfg.installmentParts} × ${formatPrice(Math.ceil(total / cfg.installmentParts), currency)}`;
    if (key === "credit") return `от ${formatPrice(creditMonthly(total, cfg.creditMonths, cfg.creditRate), currency)}/мес`;
    return "";
  };
  return (
    <div className="space-y-4">
      {groups.map(({ g, items }) => (
        <div key={g}>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">{PAYMENT_GROUP_LABELS[g]}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
            {items.map((m) => {
              const reason = disabledReason(m.key);
              const active = value === m.key;
              return (
                <button
                  type="button"
                  key={m.key}
                  role="radio"
                  aria-checked={active}
                  disabled={Boolean(reason)}
                  onClick={() => onChange(m.key)}
                  className={cn("flex min-h-[92px] flex-col items-start gap-1 rounded-card border-2 p-3 text-left transition disabled:opacity-40", active ? "border-brand bg-brand-50" : "border-ink-100 hover:border-ink-300")}
                >
                  <PaymentIcon icon={m.icon} className={active ? "text-brand" : "text-ink-500"} />
                  <span className={cn("text-sm font-semibold leading-tight", active && "text-brand")}>{m.label}</span>
                  <span className="text-[11px] leading-snug text-ink-500">{reason || hint(m.key) || m.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
