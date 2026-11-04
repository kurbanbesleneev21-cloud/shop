import "server-only";
import { createHmac } from "crypto";
import { prisma } from "./prisma";
import { invalidateCatalog } from "./catalog";
import { getGroup, getSecret, parseCategoryRates } from "./settings";
import { ApiError } from "./api";
import { notify, notifyError, esc } from "./telegram";
import { sendEmail, button, h } from "./email";
import { formatPrice, ORDER_STATUS_LABELS } from "./utils";
import { assertPublicHttpsUrl } from "./url-safety";

export type PricedLine = { productId: string; title: string; sku: string; image: string | null; price: number; oldPrice: number | null; qty: number; stock: number; sellerId: string | null; categoryId: string; categorySlug: string; slug: string; available: boolean };

export async function priceCart(items: { productId: string; qty: number }[], promoCode?: string, deliveryMethod?: string) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, slug: true, sku: true, price: true, oldPrice: true, stock: true, status: true, sellerId: true, categoryId: true, category: { select: { slug: true } }, images: { take: 1, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], select: { url: true } } },
  });
  const cart = await getGroup<{ maxQtyPerItem: number; minOrder: number; promoEnabled: boolean }>("cart");
  const lines: PricedLine[] = items
    .map((i): PricedLine | null => {
      const p = products.find((x) => x.id === i.productId);
      if (!p) return null;
      const available = p.status === "PUBLISHED" && p.stock > 0;
      return {
        productId: p.id, title: p.title, sku: p.sku, slug: p.slug, image: (p.images[0]?.url ?? null) as string | null, price: p.price, oldPrice: p.oldPrice,
        qty: Math.max(1, Math.min(i.qty, cart.maxQtyPerItem, Math.max(p.stock, 1))), stock: p.stock, sellerId: p.sellerId, categoryId: p.categoryId, categorySlug: p.category.slug, available,
      };
    })
    .filter((x): x is PricedLine => Boolean(x));
  const valid = lines.filter((l) => l.available);
  const subtotal = valid.reduce((s, l) => s + l.price * l.qty, 0);

  let discount = 0;
  let promo: { code: string; id: string } | null = null;
  let promoError: string | undefined;
  if (promoCode && cart.promoEnabled) {
    const pc = await prisma.promoCode.findUnique({ where: { code: promoCode.trim().toUpperCase() } });
    const now = new Date();
    if (!pc || !pc.active) promoError = "Промокод не найден";
    else if (pc.startsAt && pc.startsAt > now) promoError = "Промокод ещё не действует";
    else if (pc.endsAt && pc.endsAt < now) promoError = "Срок действия промокода истёк";
    else if (pc.maxUses != null && pc.usedCount >= pc.maxUses) promoError = "Лимит применений промокода исчерпан";
    else if (subtotal < pc.minOrder) promoError = `Промокод действует от ${formatPrice(pc.minOrder)}`;
    else {
      const pids = Array.isArray(pc.productIds) ? (pc.productIds as string[]) : [];
      const cids = Array.isArray(pc.categoryIds) ? (pc.categoryIds as string[]) : [];
      const eligible = valid.filter((l) => (!pids.length && !cids.length) || pids.includes(l.productId) || cids.includes(l.categoryId));
      const base = eligible.reduce((s, l) => s + l.price * l.qty, 0);
      if (!base) promoError = "Промокод не действует на товары в корзине";
      else {
        discount = pc.type === "FIXED" ? Math.min(pc.value, base) : Math.round((base * Math.min(pc.value, 100)) / 100);
        promo = { code: pc.code, id: pc.id };
      }
    }
  }

  const d = await getGroup<Record<string, number | boolean | string>>("delivery");
  const methods = (["ozon", "post"] as const).filter((m) => d[m]);
  const priceOf = (m: string) => {
    const base = Number(d[m + "Price"] || 0);
    return Number(d.freeFrom) > 0 && subtotal - discount >= Number(d.freeFrom) && m === "ozon" ? 0 : base;
  };
  const deliveryPrice = deliveryMethod && methods.includes(deliveryMethod as never) ? priceOf(deliveryMethod) : 0;
  return {
    lines,
    subtotal,
    discount,
    promo,
    promoError,
    deliveryPrice,
    deliveryOptions: methods.map((m) => ({ method: m, price: priceOf(m) })),
    total: Math.max(0, subtotal - discount + deliveryPrice),
    minOrder: cart.minOrder,
  };
}

export async function commissionRate(sellerId: string | null, categorySlug: string) {
  const c = await getGroup<{ defaultRate: number; categoryRates: string }>("commissions");
  if (sellerId) {
    const s = await prisma.seller.findUnique({ where: { id: sellerId }, select: { commissionRate: true } });
    if (s?.commissionRate != null) return s.commissionRate;
  }
  const rates = parseCategoryRates(c.categoryRates);
  return rates[categorySlug] ?? Number(c.defaultRate) ?? 10;
}

export async function afterOrderCreated(orderId: string, origin: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const lines = order.items.map((i) => `• ${esc(i.title)} × ${i.qty} — ${formatPrice(i.price * i.qty)}`).join("\n");
  notify("newOrder", `🛒 <b>Новый заказ №${order.number}</b>\n${lines}\n\nИтого: <b>${formatPrice(order.total)}</b>\nПокупатель: ${esc(order.recipientName)}, ${esc(order.phone)}\nОплата: ${esc(order.paymentMethod)} · Доставка: ${esc(order.deliveryMethod)}`);
  const n = await getGroup<{ emailOnOrder: boolean; lowStockThreshold: number }>("notifications");
  if (n.emailOnOrder) {
    await sendEmail(order.email, `Заказ №${order.number} оформлен`, `Спасибо за заказ №${order.number}!`, `<p>Мы получили ваш заказ на сумму <b>${formatPrice(order.total)}</b>.</p><p>${order.items.map((i) => `${h(i.title)} × ${i.qty}`).join("<br/>")}</p>${button(`${origin}/account/orders/${order.id}`, "Отслеживать заказ")}`);
  }
  // low stock alerts
  const low = await prisma.product.findMany({ where: { id: { in: order.items.map((i) => i.productId).filter((x): x is string => Boolean(x)) }, stock: { lte: n.lowStockThreshold } }, select: { title: true, stock: true, sku: true } });
  for (const p of low) notify("lowStock", `📉 <b>Мало товара</b>\n${esc(p.title)} (${esc(p.sku)}) — осталось ${p.stock} шт.`);
  // outgoing webhook
  const integ = await getGroup<{ webhookEnabled: boolean; webhookUrl: string }>("integrations");
  let webhookOk = false;
  try {
    if (integ.webhookEnabled) webhookOk = Boolean(assertPublicHttpsUrl(integ.webhookUrl));
  } catch {
    webhookOk = false;
  }
  if (webhookOk) {
    const payload = JSON.stringify({ event: "order.created", order: { id: order.id, number: order.number, total: order.total, status: order.status, items: order.items.map((i) => ({ sku: i.sku, title: i.title, qty: i.qty, price: i.price })) } });
    const secret = await getSecret("integrations", "webhookSecret");
    const sig = secret ? createHmac("sha256", secret).update(payload).digest("hex") : "";
    fetch(integ.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": sig }, body: payload, redirect: "manual", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
  }
}

export const STATUS_FLOW: Record<string, string[]> = {
  NEW: ["CONFIRMED", "PAID", "CANCELLED"],
  CONFIRMED: ["PAID", "SHIPPED", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURN_REQUESTED", "RETURNED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  CANCELLED: [],
  RETURNED: [],
};

/** Changes order status with history entry, stock restoration and notifications. */
export async function changeOrderStatus(orderId: string, status: string, actor: { id: string; name: string } | null, note?: string, origin?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new ApiError(404, "Заказ не найден");
  if (order.status === status) return order;
  const restock = (status === "CANCELLED" && !["CANCELLED", "RETURNED"].includes(order.status)) || (status === "RETURNED" && order.status !== "RETURNED");
  const updated = await prisma.$transaction(async (tx) => {
    // Compare-and-set: concurrent status changes (double click, expiry job) must not restock/refund twice
    const claimed = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { updatedAt: new Date() } });
    if (claimed.count === 0) throw new ApiError(409, "Статус заказа уже изменён, обновите страницу");
    if (restock) {
      for (const it of order.items) if (it.productId) await tx.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.qty }, salesCount: { decrement: it.qty } } });
    }
    const u = await tx.order.update({
      where: { id: orderId },
      data: {
        status: status as never,
        ...(status === "PAID" ? { paymentStatus: "paid" } : {}),
        ...(status === "CANCELLED" || status === "RETURNED" ? { commissionTotal: 0, cancelReason: note ?? order.cancelReason } : {}),
      },
    });
    await tx.orderEvent.create({ data: { orderId, status: status as never, note: note || null, actorId: actor?.id, actorName: actor?.name } });
    if (status === "CANCELLED") await tx.payment.updateMany({ where: { orderId, status: { in: ["PENDING", "WAITING"] } }, data: { status: "CANCELED", error: "Заказ отменён" } });
    return u;
  });
  if (restock) invalidateCatalog();
  // Payment side effects
  try {
    const { refundOrder, markPaymentSucceeded } = await import("./payments");
    if ((status === "CANCELLED" || status === "RETURNED") && order.paymentStatus === "paid") {
      const r = await refundOrder(order.id);
      if (r.refunded) await prisma.orderEvent.create({ data: { orderId: order.id, status: status as never, note: `Возврат средств ${formatPrice(r.refunded)}: ${r.note}` } });
    }
    if (status === "PAID") {
      // Kaspi: when the administrator marks the order as paid, the reported payment is confirmed
      const pending = await prisma.payment.findFirst({ where: { orderId: order.id, status: { in: ["PENDING", "WAITING"] }, provider: "kaspi" } });
      if (pending) await markPaymentSucceeded(pending.id);
    }
  } catch (e) {
    await prisma.orderEvent.create({ data: { orderId: order.id, status: status as never, note: `Ошибка платёжной операции: ${(e as Error).message}`.slice(0, 500) } });
    console.error("[orders] payment side effect failed", order.number, e);
    notifyError(`Заказ №${order.number}: ошибка возврата/подтверждения оплаты — ${(e as Error).message}. Проверьте вручную.`).catch(() => undefined);
  }
  notify("orderStatus", `📦 Заказ <b>№${order.number}</b>: ${ORDER_STATUS_LABELS[order.status]} → <b>${ORDER_STATUS_LABELS[status]}</b>${note ? "\n" + esc(note) : ""}`);
  const n = await getGroup<{ emailOnStatus: boolean }>("notifications");
  if (n.emailOnStatus) {
    sendEmail(order.email, `Заказ №${order.number}: ${ORDER_STATUS_LABELS[status]}`, `Статус заказа №${order.number} изменён`, `<p>Новый статус: <b>${ORDER_STATUS_LABELS[status]}</b></p>${note ? `<p>${esc(note)}</p>` : ""}${origin ? button(`${origin}/account/orders/${order.id}`, "Открыть заказ") : ""}`).catch(() => undefined);
  }
  return updated;
}
