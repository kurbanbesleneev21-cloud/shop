import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TestAcquiring } from "@/components/shop/test-acquiring";
import { paymentsCfg } from "@/lib/payments";

export const metadata = { title: "Оплата заказа", robots: { index: false } };

export default async function TestPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id }, include: { order: { select: { number: true, total: true } } } });
  if (!p || p.provider !== "test") notFound();
  const cfg = await paymentsCfg();
  return <TestAcquiring payment={{ id: p.id, method: p.method, amount: p.amount, status: p.status, orderNumber: p.order.number }} installmentParts={Number(cfg.installmentParts) || 4} creditMonths={Number(cfg.creditMonths) || 12} creditRate={Number(cfg.creditRate) || 0} />;
}
