import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LoginPrompt } from "@/components/shop/login-prompt";
import { SellerNav } from "@/components/shop/seller-nav";

export const metadata = { title: "Кабинет продавца", robots: { index: false } };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Кабинет продавца" text="Войдите, чтобы управлять магазином." />;
  // Server-side permission check: only approved sellers (or admins with a shop) can use the cabinet
  if (user.seller?.status !== "APPROVED") {
    return (
      <div className="container-tm py-16 text-center">
        <h1 className="text-2xl font-extrabold">Кабинет продавца недоступен</h1>
        <p className="mt-2 text-ink-500">{user.seller?.status === "PENDING" ? "Ваша заявка на рассмотрении." : user.seller?.status === "BLOCKED" ? "Магазин заблокирован администрацией." : "Сначала подайте заявку на подключение магазина."}</p>
        <Link href="/seller/register" className="btn-primary mt-6">Перейти к заявке</Link>
      </div>
    );
  }
  return (
    <div className="container-tm pt-4 sm:pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Кабинет продавца</h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand">{user.seller.shopName}</span>
      </div>
      <SellerNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
