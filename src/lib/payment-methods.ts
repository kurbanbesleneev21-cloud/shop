// Client-safe registry of payment methods. Server logic lives in lib/payments.ts.
// Payment systems: Platega (СБП, cards, international cards, crypto) and Kaspi (payment link / QR).

export type PaymentGroup = "platega" | "kaspi";

export type PaymentMethodDef = {
  key: string;
  label: string;
  short: string;
  description: string;
  group: PaymentGroup;
  /** Paid online with automatic confirmation (Platega). Kaspi is confirmed by the administrator. */
  online: boolean;
  /** paymentMethod code for Platega */
  plategaCode?: number;
  icon: "sbp" | "card" | "globe" | "crypto" | "kaspi";
  defaultEnabled: boolean;
};

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { key: "platega_sbp", label: "СБП", short: "СБП", description: "Оплата по QR-коду через приложение любого банка (Platega)", group: "platega", online: true, plategaCode: 2, icon: "sbp", defaultEnabled: true },
  { key: "platega_card", label: "Банковская карта", short: "Картой", description: "МИР, Visa, Mastercard (Platega)", group: "platega", online: true, plategaCode: 11, icon: "card", defaultEnabled: true },
  { key: "platega_intl", label: "Карта зарубежного банка", short: "Зарубежной картой", description: "Международные платежи (Platega)", group: "platega", online: true, plategaCode: 12, icon: "globe", defaultEnabled: false },
  { key: "platega_crypto", label: "Криптовалюта", short: "Криптой", description: "USDT и другие (Platega)", group: "platega", online: true, plategaCode: 13, icon: "crypto", defaultEnabled: false },
  { key: "kaspi", label: "Kaspi Pay", short: "Kaspi", description: "Оплата в приложении Kaspi.kz по ссылке или QR-коду", group: "kaspi", online: false, icon: "kaspi", defaultEnabled: true },
];

export const PAYMENT_KEYS = PAYMENT_METHODS.map((m) => m.key);
export const methodDef = (key: string) => PAYMENT_METHODS.find((m) => m.key === key);
export const PAYMENT_GROUP_LABELS: Record<PaymentGroup, string> = { platega: "Онлайн-оплата · Platega", kaspi: "Kaspi" };

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает оплаты",
  WAITING: "Покупатель сообщил об оплате",
  SUCCEEDED: "Оплачен",
  CANCELED: "Отменён",
  REFUNDED: "Возвращён",
  PARTIAL_REFUND: "Частичный возврат",
};

/** Luhn check for the test card form */
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
