import "server-only";
import type { SettingsValues } from "./settings-schema";
import type { PublicConfig } from "./public-config";
import { PAYMENT_METHODS } from "./payment-methods";

export function toPublicConfig(s: SettingsValues): PublicConfig {
  const g = s.general as Record<string, never>;
  return {
    siteName: String(g.siteName || "TECHMARKET"),
    logoUrl: String(g.logoUrl || ""),
    currency: String(g.currency || "₽"),
    registration: s.registration as PublicConfig["registration"],
    cart: s.cart as PublicConfig["cart"],
    delivery: s.delivery as PublicConfig["delivery"],
    payments: {
      enabled: PAYMENT_METHODS.filter((m) => s.payments[m.key] !== false && (s.payments[m.key] ?? m.defaultEnabled)).map((m) => m.key),
      testMode: s.payments.provider !== "yookassa" && s.payments.provider !== "tbank",
      installmentParts: Number(s.payments.installmentParts) || 4,
      creditMonths: Number(s.payments.creditMonths) || 12,
      creditRate: Number(s.payments.creditRate) || 0,
      creditMinAmount: Number(s.payments.creditMinAmount) || 0,
      cashMaxAmount: Number(s.payments.cashMaxAmount) || 0,
    },
    passwordMinLength: Number(s.auth.passwordMinLength) || 8,
    animations: s.design.animations !== false,
    headerStyle: String(s.design.headerStyle || "light"),
    maxUploadMb: Number(s.security.maxUploadMb) || 10,
  };
}
