import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LoginPrompt } from "@/components/shop/login-prompt";
import { AccountNav } from "@/components/shop/account-nav";

export const metadata = { title: "Личный кабинет", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Личный кабинет" text="Войдите, чтобы видеть заказы, управлять профилем и оставлять отзывы." />;
  return (
    <div className="container-tm pt-4 sm:pt-6">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">{user.name[0]}</span>
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{user.name}</h1>
          <div className="text-sm text-ink-500">{user.email}{user.role === "ADMIN" && <> · <Link href="/admin" className="link">Админ-панель</Link></>}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <AccountNav seller={user.seller?.status ?? null} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
