import type { Metadata } from "next";
import { CheckoutView } from "@/components/shop/checkout-view";

export const metadata: Metadata = { title: "Оформление заказа", robots: { index: false } };
export default function CheckoutPage() {
  return <CheckoutView />;
}
