export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(value: number | null | undefined, currency = "₽") {
  if (value == null) return "";
  // Deterministic formatting: identical on the server and in every browser (no hydration mismatches)
  const n = Math.round(value);
  const str = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return (n < 0 ? "−" : "") + str + "\u00A0" + currency;
}

export function discountPercent(price: number, oldPrice?: number | null) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

const translit: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "",
  ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => (translit[ch] !== undefined ? translit[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

export function formatDate(d: Date | string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function asRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val !== null && val !== undefined && String(val).trim() !== "") out[k] = String(val);
  }
  return out;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PAID: "Оплачен",
  SHIPPED: "Передан в доставку",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
  RETURN_REQUESTED: "Запрошен возврат",
  RETURNED: "Возвращён",
};

import { PAYMENT_METHODS } from "./payment-methods";
export const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.key, m.label]));

export const DELIVERY_LABELS: Record<string, string> = {
  ozon: "Пункт выдачи Ozon",
  post: "Почта России",
  // old orders placed before Ozon/Post-only delivery
  courier: "Курьером",
  pickup: "Самовывоз из пункта выдачи",
};

export function maskSecret(v?: string | null) {
  if (!v) return "";
  if (v.length <= 6) return "••••";
  return v.slice(0, 3) + "••••••" + v.slice(-2);
}
