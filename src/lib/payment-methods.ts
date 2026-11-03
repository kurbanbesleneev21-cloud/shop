// Client-safe registry of payment methods. Server logic lives in lib/payments.ts.

export type PaymentGroup = "online" | "delivery" | "business";

export type PaymentMethodDef = {
  key: string;
  label: string;
  short: string;
  description: string;
  group: PaymentGroup;
  /** Paid online through the acquiring provider (ЮKassa / Т-Банк / test) */
  online: boolean;
  /** payment_method_data.type for ЮKassa (undefined → user chooses on the ЮKassa page) */
  yookassaType?: string;
  icon: "card" | "sbp" | "sber" | "tpay" | "yoomoney" | "mir" | "wallet" | "parts" | "credit" | "cash" | "pos" | "invoice";
  defaultEnabled: boolean;
};

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { key: "card", label: "Банковская карта", short: "Картой онлайн", description: "МИР, Visa, Mastercard, UnionPay", group: "online", online: true, yookassaType: "bank_card", icon: "card", defaultEnabled: true },
  { key: "sbp", label: "СБП", short: "СБП", description: "Система быстрых платежей — оплата по QR-коду из приложения банка", group: "online", online: true, yookassaType: "sbp", icon: "sbp", defaultEnabled: true },
  { key: "sberpay", label: "SberPay", short: "SberPay", description: "Оплата в приложении СберБанк Онлайн", group: "online", online: true, yookassaType: "sberbank", icon: "sber", defaultEnabled: true },
  { key: "tpay", label: "T-Pay", short: "T-Pay", description: "Оплата в приложении Т-Банка", group: "online", online: true, yookassaType: "tinkoff_bank", icon: "tpay", defaultEnabled: true },
  { key: "yoomoney", label: "ЮMoney", short: "ЮMoney", description: "Кошелёк ЮMoney", group: "online", online: true, yookassaType: "yoo_money", icon: "yoomoney", defaultEnabled: true },
  { key: "mirpay", label: "Mir Pay", short: "Mir Pay", description: "Бесконтактная оплата картой МИР со смартфона", group: "online", online: true, yookassaType: "bank_card", icon: "mir", defaultEnabled: true },
  { key: "wallet", label: "Apple Pay / Google Pay", short: "Apple / Google Pay", description: "Оплата картой, сохранённой в телефоне", group: "online", online: true, yookassaType: "bank_card", icon: "wallet", defaultEnabled: false },
  { key: "installments", label: "Оплата частями", short: "Частями", description: "Без переплаты: 4 платежа раз в две недели", group: "online", online: true, yookassaType: "installments", icon: "parts", defaultEnabled: true },
  { key: "credit", label: "Кредит или рассрочка", short: "В кредит", description: "Онлайн-заявка в банк, решение за 2 минуты", group: "online", online: true, yookassaType: "sber_loan", icon: "credit", defaultEnabled: true },
  { key: "cash", label: "Наличными при получении", short: "Наличными", description: "Курьеру или в пункте выдачи", group: "delivery", online: false, icon: "cash", defaultEnabled: true },
  { key: "card_on_delivery", label: "Картой при получении", short: "Картой курьеру", description: "Терминал у курьера и в пунктах выдачи", group: "delivery", online: false, icon: "pos", defaultEnabled: true },
  { key: "invoice", label: "Счёт для юрлиц и ИП", short: "По счёту", description: "Безналичная оплата по счёту, закрывающие документы", group: "business", online: false, icon: "invoice", defaultEnabled: true },
];

export const PAYMENT_KEYS = PAYMENT_METHODS.map((m) => m.key);
export const methodDef = (key: string) => PAYMENT_METHODS.find((m) => m.key === key);
export const PAYMENT_GROUP_LABELS: Record<PaymentGroup, string> = { online: "Онлайн", delivery: "При получении", business: "Для бизнеса" };

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает оплаты",
  WAITING: "Ожидает подтверждения",
  SUCCEEDED: "Оплачен",
  CANCELED: "Отменён",
  REFUNDED: "Возвращён",
  PARTIAL_REFUND: "Частичный возврат",
};

/** Monthly payment for a credit (annuity). rate — % per year. */
export function creditMonthly(total: number, months: number, ratePercent: number) {
  if (months <= 0) return total;
  const r = ratePercent / 100 / 12;
  if (r <= 0) return Math.ceil(total / months);
  return Math.ceil((total * r) / (1 - Math.pow(1 + r, -months)));
}

/** Luhn check for test card form */
export function luhnValid(num: string) {
  const d = num.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
