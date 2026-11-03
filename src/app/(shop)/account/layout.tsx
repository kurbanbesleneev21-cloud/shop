import { getCurrentUser } from "@/lib/session";
import { LoginPrompt } from "@/components/shop/login-prompt";
import { AccountNav } from "@/components/shop/account-nav";

export const metadata = { title: "Личный кабинет", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Личный кабинет" text="Войдите, чтобы видеть заказы, управлять профилем и оставлять отзывы." />;
  return (
    <div className="container-tm pt-3 sm:pt-6">
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="mb-4 hidden items-center gap-3 lg:flex">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg font-bold text-white">{user.name[0]?.toUpperCase()}</span>
            <div className="min-w-0">
              <div className="truncate font-bold">{user.name}</div>
              <div className="truncate text-xs text-ink-500">{user.phone || user.email}</div>
            </div>
          </div>
          <AccountNav seller={user.seller?.status ?? null} admin={user.role === "ADMIN"} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
