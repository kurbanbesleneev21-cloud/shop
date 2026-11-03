import { PaymentResult } from "@/components/shop/payment-result";

export const metadata = { title: "Результат оплаты", robots: { index: false } };

export default async function PayReturn({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  return <PaymentResult paymentId={p ?? ""} />;
}
