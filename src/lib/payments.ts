import "server-only";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { getGroup, getSecret } from "./settings";
import { methodDef } from "./payment-methods";
import { randomToken } from "./crypto";
import { notify, esc } from "./telegram";
import { formatPrice } from "./utils";

export type PaymentsCfg = Record<string, unknown> & {
  provider: "test" | "yookassa" | "tbank";
  yookassaShopId: string;
  tbankTerminalKey: string;
  paymentTimeoutMinutes: number;
  installmentParts: number;
  creditMonths: number;
  creditRate: number;
  creditMinAmount: number;
  cashMaxAmount: number;
};

export const paymentsCfg = () => getGroup<PaymentsCfg>("payments");

const rub = (kopecksOrRub: number) => (Math.round(kopecksOrRub * 100) / 100).toFixed(2);

// ---------------- ЮKassa ----------------
async function yookassaAuth() {
  const cfg = await paymentsCfg();
  const secret = await getSecret("payments", "yookassaSecret");
  if (!cfg.yookassaShopId || !secret) throw new Error("ЮKassa не настроена: укажите shopId и секретный ключ");
  return "Basic " + Buffer.from(`${cfg.yookassaShopId}:${secret}`).toString("base64");
}

async function yookassaRequest<T>(path: string, init: { method: string; body?: unknown; idempotenceKey?: string }) {
  const res = await fetch(`https://api.yookassa.ru/v3${path}`, {
    method: init.method,
    headers: {
      Authorization: await yookassaAuth(),
      "Content-Type": "application/json",
      ...(init.idempotenceKey ? { "Idempotence-Key": init.idempotenceKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { description?: string };
  if (!res.ok) throw new Error(`ЮKassa: ${data.description || res.status}`);
  return data;
}

// ---------------- Т-Банк ----------------
/** Token = SHA-256 of concatenated values of root scalar params + Password, sorted by key (Т-Банк spec). */
export function tbankToken(params: Record<string, unknown>, password: string) {
  const entries = Object.entries({ ...params, Password: password })
    .filter(([k, v]) => k !== "Token" && v !== undefined && v !== null && typeof v !== "object")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return createHash("sha256").update(entries.map(([, v]) => String(v)).join("")).digest("hex");
}

async function tbankRequest<T>(method: string, params: Record<string, unknown>) {
  const cfg = await paymentsCfg();
  const password = await getSecret("payments", "tbankPassword");
  if (!cfg.tbankTerminalKey || !password) throw new Error("Т-Банк не настроен: укажите TerminalKey и пароль");
  const body = { TerminalKey: cfg.tbankTerminalKey, ...params };
  const res = await fetch(`https://securepay.tinkoff.ru/v2/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, Token: tbankToken(body, password) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { Success?: boolean; Message?: string; Details?: string };
  if (!res.ok || data.Success === false) throw new Error(`Т-Банк: ${data.Message || data.Details || res.status}`);
  return data;
}

// ---------------- common ----------------

/** Creates a payment for an order. Returns the URL the buyer must be redirected to (or null for offline methods). */
export async function createPayment(orderId: string, origin: string): Promise<{ paymentId: string; redirectUrl: string | null }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Заказ не найден");
  const def = methodDef(order.paymentMethod);
  if (!def) throw new Error("Неизвестный способ оплаты");
  const cfg = await paymentsCfg();
  const provider = !def.online ? (order.paymentMethod === "invoice" ? "invoice" : "offline") : cfg.provider;
  const payment = await prisma.payment.create({
    data: { orderId: order.id, method: order.paymentMethod, provider, amount: order.total, idempotenceKey: randomToken(18) },
  });
  if (!def.online) {
    return { paymentId: payment.id, redirectUrl: order.paymentMethod === "invoice" ? `/pay/invoice/${order.id}` : null };
  }
  const returnUrl = `${origin}/pay/return?p=${payment.id}`;
  const description = `Заказ №${order.number} в TECHMARKET`;
  try {
    if (provider === "yookassa") {
      const r = await yookassaRequest<{ id: string; status: string; confirmation?: { confirmation_url?: string } }>("/payments", {
        method: "POST",
        idempotenceKey: payment.idempotenceKey,
        body: {
          amount: { value: rub(order.total), currency: "RUB" },
          capture: true,
          confirmation: { type: "redirect", return_url: returnUrl },
          ...(def.yookassaType && !["mirpay", "wallet"].includes(def.key) ? { payment_method_data: { type: def.yookassaType } } : {}),
          description,
          metadata: { orderId: order.id, paymentId: payment.id },
        },
      });
      const url = r.confirmation?.confirmation_url ?? null;
      await prisma.payment.update({ where: { id: payment.id }, data: { externalId: r.id, confirmationUrl: url, status: r.status === "succeeded" ? "SUCCEEDED" : "PENDING" } });
      return { paymentId: payment.id, redirectUrl: url };
    }
    if (provider === "tbank") {
      const r = await tbankRequest<{ PaymentId: string | number; PaymentURL: string }>("Init", {
        Amount: order.total * 100,
        OrderId: payment.id,
        Description: description,
        SuccessURL: returnUrl,
        FailURL: returnUrl,
        NotificationURL: `${origin}/api/payments/tbank`,
        DATA: { Email: order.email, Phone: order.phone },
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { externalId: String(r.PaymentId), confirmationUrl: r.PaymentURL } });
      return { paymentId: payment.id, redirectUrl: r.PaymentURL };
    }
    // test acquiring — our own page, no money is charged
    const url = `/pay/${payment.id}`;
    await prisma.payment.update({ where: { id: payment.id }, data: { confirmationUrl: url } });
    return { paymentId: payment.id, redirectUrl: url };
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
  await prisma.payment.update({ where: { id: p.id }, data: { status: "SUCCEEDED", paidAt: now, ...(meta ? { meta: meta as object } : {}) } });
  await prisma.order.update({ where: { id: p.orderId }, data: { paymentStatus: "paid", paidAt: now } });
  if (["NEW", "CONFIRMED"].includes(p.order.status)) {
    const { changeOrderStatus } = await import("./orders");
    await changeOrderStatus(p.orderId, "PAID", null, `Оплата получена: ${methodDef(p.method)?.label ?? p.method} (${p.provider})`);
  }
  notify("newOrder", `💳 <b>Оплачен заказ №${p.order.number}</b> — ${formatPrice(p.amount)} · ${esc(methodDef(p.method)?.label ?? p.method)}`);
  return p;
}

export async function markPaymentCanceled(paymentId: string, reason?: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.status !== "PENDING") return;
  await prisma.payment.update({ where: { id: p.id }, data: { status: "CANCELED", error: reason?.slice(0, 500) } });
}

/** Asks the provider for the real status (used on return page and to verify webhooks). */
export async function syncPayment(paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.status !== "PENDING" || !p.externalId) return p;
  if (p.provider === "yookassa") {
    const r = await yookassaRequest<{ status: string; cancellation_details?: { reason?: string } }>(`/payments/${encodeURIComponent(p.externalId)}`, { method: "GET" });
    if (r.status === "succeeded") await markPaymentSucceeded(p.id);
    else if (r.status === "canceled") await markPaymentCanceled(p.id, r.cancellation_details?.reason);
  } else if (p.provider === "tbank") {
    const r = await tbankRequest<{ Status: string }>("GetState", { PaymentId: p.externalId });
    if (["CONFIRMED", "AUTHORIZED"].includes(r.Status)) await markPaymentSucceeded(p.id);
    else if (["REJECTED", "CANCELED", "DEADLINE_EXPIRED", "AUTH_FAIL"].includes(r.Status)) await markPaymentCanceled(p.id, r.Status);
  }
  return prisma.payment.findUnique({ where: { id: paymentId } });
}

/** Refunds the successful payment of an order (full amount by default). */
export async function refundOrder(orderId: string, amount?: number) {
  const p = await prisma.payment.findFirst({ where: { orderId, status: { in: ["SUCCEEDED", "PARTIAL_REFUND"] } }, orderBy: { createdAt: "desc" } });
  if (!p) return { refunded: 0, note: "Успешных платежей нет" };
  const left = p.amount - p.refundedAmount;
  const sum = Math.min(amount ?? left, left);
  if (sum <= 0) return { refunded: 0, note: "Уже возвращено" };
  if (p.provider === "yookassa" && p.externalId) {
    await yookassaRequest("/refunds", { method: "POST", idempotenceKey: randomToken(18), body: { payment_id: p.externalId, amount: { value: rub(sum), currency: "RUB" } } });
  } else if (p.provider === "tbank" && p.externalId) {
    await tbankRequest("Cancel", { PaymentId: p.externalId, Amount: sum * 100 });
  }
  // test / offline / invoice: refund is recorded; offline money is returned manually
  const refundedAmount = p.refundedAmount + sum;
  const full = refundedAmount >= p.amount;
  await prisma.payment.update({ where: { id: p.id }, data: { refundedAmount, status: full ? "REFUNDED" : "PARTIAL_REFUND" } });
  if (full) await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "refunded" } });
  return { refunded: sum, note: p.provider === "offline" || p.provider === "invoice" ? "Верните деньги покупателю вручную" : `Возврат через ${p.provider}` };
}

/** Cancels unpaid online orders after the payment timeout and returns goods to stock. */
export async function expireUnpaidOrders() {
  const cfg = await paymentsCfg();
  const deadline = new Date(Date.now() - Math.max(10, Number(cfg.paymentTimeoutMinutes) || 60) * 60_000);
  const onlineKeys = (await import("./payment-methods")).PAYMENT_METHODS.filter((m) => m.online).map((m) => m.key);
  const stale = await prisma.order.findMany({ where: { status: "NEW", paymentStatus: "pending", paymentMethod: { in: onlineKeys }, createdAt: { lt: deadline } }, select: { id: true }, take: 50 });
  if (!stale.length) return 0;
  const { changeOrderStatus } = await import("./orders");
  for (const o of stale) {
    await prisma.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELED", error: "Истёк срок оплаты" } });
    await changeOrderStatus(o.id, "CANCELLED", null, "Автоматически: заказ не оплачен вовремя").catch(() => undefined);
  }
  return stale.length;
}
