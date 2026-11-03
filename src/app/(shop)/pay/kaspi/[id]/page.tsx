import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { paymentsCfg } from "@/lib/payments";
import { KaspiPay } from "@/components/shop/kaspi-pay";

export const metadata = { title: "Оплата через Kaspi", robots: { index: false } };

export default async function KaspiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id }, include: { order: { select: { number: true, id: true, userId: true } } } });
  if (!p || p.provider !== "kaspi") notFound();
  const cfg = await paymentsCfg();
  const rate = Number(cfg.kaspiRate) || 0;
  return (
    <KaspiPay
      payment={{ id: p.id, amount: p.amount, status: p.status, orderNumber: p.order.number, orderId: p.order.userId ? p.order.id : null }}
      link={/^https:\/\//.test(cfg.kaspiPayLink) ? cfg.kaspiPayLink : ""}
      qr={cfg.kaspiQr || ""}
      tenge={rate > 0 ? Math.ceil(p.amount * rate) : 0}
      instructions={cfg.kaspiInstructions}
    />
  );
}
