import "server-only";
import { prisma } from "./prisma";
import { getGroup, getSecret } from "./settings";
import { methodDef, PAYMENT_METHODS } from "./payment-methods";
import { randomToken } from "./crypto";
import { notify, esc } from "./telegram";
import { formatPrice } from "./utils";

export type PaymentsCfg = Record<string, unknown> & {
  provider: "platega" | "test";
  plategaMerchantId: string;
  plategaCardCode: number;
  kaspiPayLink: string;
  kaspiQr: string;
  kaspiRate: number;
  kaspiInstructions: string;
  paymentTimeoutMinutes: number;
};

export const paymentsCfg = () => getGroup<PaymentsCfg>("payments");

// ---------------- Platega (https://app.platega.io) ----------------
// Request format follows the Platega API as implemented by the public SDK (github.com/DOFER998/aioplatega):
// auth headers X-MerchantId / X-Secret, POST /transaction/process, GET /transaction/{id}, POST /transaction/{id}/cancel.
// PLATEGA_API_URL can point to a mock server in tests; production always uses the official host
const PLATEGA_URL = process.env.NODE_ENV === "production" && !process.env.PLATEGA_API_URL_ALLOW ? "https://app.platega.io" : process.env.PLATEGA_API_URL || "https://app.platega.io";

async function plategaCreds() {
  const cfg = await paymentsCfg();
  const secret = await getSecret("payments", "plategaSecret");
  if (!cfg.plategaMerchantId || !secret) throw new Error("Platega не настроена: укажите Merchant ID и API-ключ в «Глобальные настройки → Платежи»");
  return { merchantId: cfg.plategaMerchantId.trim(), secret };
}

export async function plategaConfigured() {
  const cfg = await paymentsCfg();
  return Boolean(cfg.plategaMerchantId && (await getSecret("payments", "plategaSecret")));
}

async function plategaRequest<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const { merchantId, secret } = await plategaCreds();
  const res = await fetch(PLATEGA_URL + path, {
    method: init.method,
    headers: { "X-MerchantId": merchantId, "X-Secret": secret, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 200) };
  }
  if (!res.ok) {
    const d = data as { message?: string; error?: string; title?: string };
    throw new Error(`Platega: ${d.message || d.error || d.title || "HTTP " + res.status}`);
  }
  return data as T;
}

/** Verifies callback credentials (Platega echoes the merchant id and secret in headers). */
export async function plategaCallbackAuthentic(headers: Headers) {
  const cfg = await paymentsCfg();
  const secret = await getSecret("payments", "plategaSecret");
  if (!cfg.plategaMerchantId || !secret) return false;
  const { timingSafeEqual } = await import("crypto");
  const eq = (a: string, b: string) => {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const mid = headers.get("x-merchantid") ?? headers.get("x-merchant-id") ?? "";
  const sec = headers.get("x-secret") ?? "";
  return eq(mid, cfg.plategaMerchantId.trim()) && eq(sec, secret);
}

// ---------------- common ----------------

/** Creates a payment for an order. Returns the URL the buyer must be redirected to. */
export async function createPayment(orderId: string, origin: string): Promise<{ paymentId: string; redirectUrl: string | null }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Заказ не найден");
  const def = methodDef(order.paymentMethod);
  if (!def) throw new Error("Неизвестный способ оплаты");
  const cfg = await paymentsCfg();
  const provider = def.group === "kaspi" ? "kaspi" : cfg.provider === "test" ? "test" : "platega";
  const payment = await prisma.payment.create({
    data: { orderId: order.id, method: order.paymentMethod, provider, amount: order.total, idempotenceKey: randomToken(18) },
  });
  if (provider === "kaspi") {
    const url = `/pay/kaspi/${payment.id}`;
    await prisma.payment.update({ where: { id: payment.id }, data: { confirmationUrl: url } });
    return { paymentId: payment.id, redirectUrl: url };
  }
  if (provider === "test") {
    const url = `/pay/${payment.id}`;
    await prisma.payment.update({ where: { id: payment.id }, data: { confirmationUrl: url } });
    return { paymentId: payment.id, redirectUrl: url };
  }
  const returnUrl = `${origin}/pay/return?p=${payment.id}`;
  try {
    const code = def.key === "platega_card" ? Number(cfg.plategaCardCode) || def.plategaCode : def.plategaCode;
    const r = await plategaRequest<{ transactionId?: string; redirect?: string; status?: string }>("/transaction/process", {
      method: "POST",
      body: {
        paymentMethod: code,
        paymentDetails: { amount: order.total, currency: "RUB" },
        description: `Заказ №${order.number} в TECHMARKET`,
        return: returnUrl,
        failedUrl: returnUrl,
        payload: payment.id,
      },
    });
    if (!r.transactionId || !r.redirect) throw new Error("Platega не вернула ссылку на оплату");
    await prisma.payment.update({ where: { id: payment.id }, data: { externalId: String(r.transactionId), confirmationUrl: r.redirect } });
    return { paymentId: payment.id, redirectUrl: r.redirect };
  } catch (e) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELED", error: (e as Error).message.slice(0, 500) } });
    throw e;
  }
}

/** Idempotently marks a payment as paid and moves the order to PAID. */
export async function markPaymentSucceeded(paymentId: string, meta?: Record<string, unknown>) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!p || p.status === "SUCCEEDED" || p.status === "REFUNDED") return p;
  const now = new Date();
  // Atomic claim: callback, status sync and manual confirmation may race
  const claimed = await prisma.$transaction(async (tx) => {
    const r = await tx.payment.updateMany({ where: { id: p.id, status: { in: ["PENDING", "WAITING"] } }, data: { status: "SUCCEEDED", paidAt: now, ...(meta ? { meta: meta as object } : {}) } });
    if (r.count === 0) return false;
    await tx.order.update({ where: { id: p.orderId }, data: { paymentStatus: "paid", paidAt: now } });
    return true;
  });
  if (!claimed) return p;
  if (["NEW", "CONFIRMED"].includes(p.order.status)) {
    const { changeOrderStatus } = await import("./orders");
    await changeOrderStatus(p.orderId, "PAID", null, `Оплата получена: ${methodDef(p.method)?.label ?? p.method} (${p.provider})`);
  }
  notify("newOrder", `💳 <b>Оплачен заказ №${p.order.number}</b> — ${formatPrice(p.amount)} · ${esc(methodDef(p.method)?.label ?? p.method)}`);
  return p;
}

export async function markPaymentCanceled(paymentId: string, reason?: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || !["PENDING", "WAITING"].includes(p.status)) return;
  await prisma.payment.update({ where: { id: p.id }, data: { status: "CANCELED", error: reason?.slice(0, 500) } });
}

/** Asks Platega for the real status — the only source of truth for marking an order paid. */
export async function syncPayment(paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.provider !== "platega" || !p.externalId || !["PENDING", "SUCCEEDED"].includes(p.status)) return p;
  const r = await plategaRequest<{ status?: string; paymentDetails?: { amount?: number; currency?: string }; payload?: string }>(`/transaction/${encodeURIComponent(p.externalId)}`, { method: "GET" });
  const status = String(r.status ?? "").toUpperCase();
  if (status === "CONFIRMED" && p.status === "PENDING") {
    const amount = Number(r.paymentDetails?.amount);
    const currency = r.paymentDetails?.currency;
    if (!Number.isFinite(amount) || Math.round(amount) !== p.amount || (currency && currency.toUpperCase() !== "RUB")) {
      await prisma.payment.update({ where: { id: p.id }, data: { error: `Сумма в Platega (${r.paymentDetails?.amount ?? "нет"} ${currency ?? ""}) не совпадает с заказом (${p.amount} RUB) — проверьте вручную` } });
      return prisma.payment.findUnique({ where: { id: paymentId } });
    }
    await markPaymentSucceeded(p.id, { plategaStatus: status });
  } else if (["CANCELED", "EXPIRED", "FAILED"].includes(status) && p.status === "PENDING") {
    await markPaymentCanceled(p.id, `Platega: ${status}`);
  } else if (status === "CHARGEBACKED" && p.status === "SUCCEEDED") {
    await prisma.payment.update({ where: { id: p.id }, data: { status: "REFUNDED", refundedAmount: p.amount, error: "Chargeback" } });
    await prisma.order.update({ where: { id: p.orderId }, data: { paymentStatus: "refunded" } });
  }
  return prisma.payment.findUnique({ where: { id: paymentId } });
}

/** Refunds the successful payment of an order. Platega cancels the whole transaction. */
export async function refundOrder(orderId: string, amount?: number) {
  const p = await prisma.payment.findFirst({ where: { orderId, status: { in: ["SUCCEEDED", "PARTIAL_REFUND"] } }, orderBy: { createdAt: "desc" } });
  if (!p) return { refunded: 0, note: "Успешных платежей нет" };
  const left = p.amount - p.refundedAmount;
  let sum = Math.min(amount ?? left, left);
  if (sum <= 0) return { refunded: 0, note: "Уже возвращено" };
  let note = "Верните деньги покупателю вручную";
  if (p.provider === "platega" && p.externalId) {
    // Platega API refunds the whole transaction
    const r = await plategaRequest<{ accepted?: boolean; manualControlRequired?: boolean; message?: string }>(`/transaction/${encodeURIComponent(p.externalId)}/cancel`, { method: "POST" });
    sum = left;
    note = r.accepted === false ? "Platega приняла запрос на ручную обработку возврата" : "Возврат через Platega";
  } else if (p.provider === "kaspi") note = "Верните деньги покупателю через Kaspi Pay (возврат в кабинете Kaspi)";
  else if (p.provider === "test") note = "Тестовый режим";
  const refundedAmount = p.refundedAmount + sum;
  const full = refundedAmount >= p.amount;
  await prisma.payment.update({ where: { id: p.id }, data: { refundedAmount, status: full ? "REFUNDED" : "PARTIAL_REFUND" } });
  if (full) await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "refunded" } });
  return { refunded: sum, note };
}

/** Cancels unpaid orders after the payment timeout and returns goods to stock. */
export async function expireUnpaidOrders() {
  const cfg = await paymentsCfg();
  const deadline = new Date(Date.now() - Math.max(10, Number(cfg.paymentTimeoutMinutes) || 60) * 60_000);
  const keys = PAYMENT_METHODS.map((m) => m.key);
  const stale = await prisma.order.findMany({
    where: { status: "NEW", paymentStatus: "pending", paymentMethod: { in: keys }, createdAt: { lt: deadline }, payments: { none: { status: "WAITING" } } },
    select: { id: true },
    take: 50,
  });
  if (!stale.length) return 0;
  const { changeOrderStatus } = await import("./orders");
  for (const o of stale) {
    await prisma.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELED", error: "Истёк срок оплаты" } });
    await changeOrderStatus(o.id, "CANCELLED", null, "Автоматически: заказ не оплачен вовремя").catch((e) => console.error("[payments] auto-cancel failed", o.id, (e as Error).message));
  }
  return stale.length;
}
