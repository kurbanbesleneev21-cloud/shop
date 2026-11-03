import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation";
import { priceCart, commissionRate, afterOrderCreated } from "@/lib/orders";
import { getGroup } from "@/lib/settings";
import { dbLimit } from "@/lib/rate-limit";
import { createPayment, expireUnpaidOrders, paymentsCfg, plategaConfigured } from "@/lib/payments";
import { methodDef } from "@/lib/payment-methods";

export const GET = route({ auth: "user" }, async (_req, { user }) => {
  const orders = await prisma.order.findMany({ where: { userId: user!.id }, orderBy: { createdAt: "desc" }, include: { items: true } });
  return ok({ orders });
});

export const POST = route({}, async (req, { user, ip }) => {
  if (!(await dbLimit("checkout:" + (user?.id ?? ip), 20, 60 * 60_000))) throw new ApiError(429, "Слишком много заказов, попробуйте позже");
  const data = await body(req, checkoutSchema);
  const cartCfg = await getGroup<{ allowGuestCheckout: boolean }>("cart");
  const reg = await getGroup<{ requireEmailVerification: boolean }>("registration");
  if (!user && !cartCfg.allowGuestCheckout) throw new ApiError(401, "Войдите, чтобы оформить заказ");
  if (user && reg.requireEmailVerification && !user.emailVerified) throw new ApiError(403, "Подтвердите email в личном кабинете, чтобы оформить заказ");
  const payments = await paymentsCfg();
  const def = methodDef(data.paymentMethod);
  if (!def || payments[data.paymentMethod] === false || (payments[data.paymentMethod] === undefined && !def.defaultEnabled)) throw new ApiError(400, "Этот способ оплаты недоступен");
  if (def.group === "platega" && payments.provider !== "test" && !(await plategaConfigured())) throw new ApiError(503, "Онлайн-оплата временно недоступна. Выберите другой способ оплаты.");
  if (def.group === "kaspi" && !/^https:\/\//.test(String(payments.kaspiPayLink || "")) && !payments.kaspiQr) throw new ApiError(503, "Оплата через Kaspi временно недоступна");
  expireUnpaidOrders().catch(() => undefined);
  if (data.deliveryMethod !== "pickup" && (!data.city || !data.address)) throw new ApiError(400, "Укажите город и адрес доставки");

  const priced = await priceCart(data.items, data.promoCode || undefined, data.deliveryMethod);
  if (data.promoCode && priced.promoError) throw new ApiError(400, priced.promoError);
  const unavailable = priced.lines.filter((l) => !l.available);
  if (unavailable.length) throw new ApiError(409, `Товар «${unavailable[0].title}» недоступен для заказа. Обновите корзину.`);
  if (!priced.lines.length) throw new ApiError(400, "Корзина пуста");
  if (priced.subtotal < priced.minOrder) throw new ApiError(400, `Минимальная сумма заказа — ${priced.minOrder} ₽`);
  if (!priced.deliveryOptions.some((o) => o.method === data.deliveryMethod)) throw new ApiError(400, "Способ доставки недоступен");

  const items = await Promise.all(
    priced.lines.map(async (l) => {
      const rate = await commissionRate(l.sellerId, l.categorySlug);
      return { productId: l.productId, sellerId: l.sellerId, title: l.title, sku: l.sku, image: l.image, price: l.price, qty: l.qty, commissionRate: rate, commission: Math.round((l.price * l.qty * rate) / 100) };
    }),
  );

  const order = await prisma.$transaction(async (tx) => {
    for (const it of items) {
      const res = await tx.product.updateMany({ where: { id: it.productId, stock: { gte: it.qty }, status: "PUBLISHED" }, data: { stock: { decrement: it.qty }, salesCount: { increment: it.qty } } });
      if (res.count === 0) throw new ApiError(409, `Недостаточно товара «${it.title}» на складе`);
    }
    if (priced.promo) {
      // Atomic check-and-increment: concurrent checkouts cannot exceed maxUses
      const used = await tx.$executeRaw`UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1
        WHERE id = ${priced.promo.id} AND active = true AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (used === 0) throw new ApiError(409, "Лимит промокода исчерпан");
    }
    return tx.order.create({
      data: {
        userId: user?.id ?? null,
        status: "NEW",
        paymentStatus: "pending",
        subtotal: priced.subtotal,
        discount: priced.discount,
        deliveryPrice: priced.deliveryPrice,
        total: priced.total,
        commissionTotal: items.reduce((s, i) => s + i.commission, 0),
        promoCode: priced.promo?.code,
        paymentMethod: data.paymentMethod,
        deliveryMethod: data.deliveryMethod,
        recipientName: data.recipientName,
        phone: data.phone,
        email: data.email,
        city: data.city || null,
        address: data.address || null,
        comment: data.comment || null,
        items: { create: items },
        events: { create: [{ status: "NEW", note: `Заказ оформлен · оплата: ${def.label}` }] },
      },
    });
  });
  await afterOrderCreated(order.id, req.nextUrl.origin).catch((e) => console.error(e));
  let redirectUrl: string | null = null;
  let paymentError: string | undefined;
  try {
    redirectUrl = (await createPayment(order.id, req.nextUrl.origin)).redirectUrl;
  } catch (e) {
    paymentError = (e as Error).message;
  }
  return ok({ ok: true, id: order.id, number: order.number, redirectUrl, online: def.online, paymentError });
});
