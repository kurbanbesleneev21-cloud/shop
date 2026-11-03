import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LoginPrompt } from "@/components/shop/login-prompt";
import { SellerRegisterForm } from "@/components/shop/seller-register";
import Link from "next/link";

export const metadata = { title: "Стать продавцом" };

export default async function SellerRegister() {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Продавайте на VITRINA" text="Войдите или зарегистрируйтесь, чтобы подать заявку на подключение магазина." />;
  const s = await prisma.seller.findUnique({ where: { userId: user.id } });
  return (
    <div className="container-tm max-w-3xl pt-6">
      <div className="rounded-card bg-ink p-6 text-white sm:p-10">
        <h1 className="text-3xl font-extrabold">Продавайте на VITRINA</h1>
        <p className="mt-2 text-white/70">Миллионы покупателей, удобный кабинет, быстрые выплаты и прозрачные комиссии.</p>
      </div>
      <div className="mt-6">
        {s && s.status === "PENDING" ? (
          <div className="rounded-card bg-brand-50 p-6"><b>Заявка «{s.shopName}» на рассмотрении.</b> Мы уведомим вас после проверки.</div>
        ) : s && s.status === "APPROVED" ? (
          <div className="rounded-card bg-brand-50 p-6">Ваш магазин «{s.shopName}» подключён. <Link href="/seller" className="link font-semibold">Перейти в кабинет продавца →</Link></div>
        ) : s && s.status === "BLOCKED" ? (
          <div className="rounded-card bg-ink-100 p-6">Магазин заблокирован. Обратитесь в поддержку.</div>
        ) : (
          <SellerRegisterForm rejected={s?.status === "REJECTED"} />
        )}
      </div>
    </div>
  );
}
