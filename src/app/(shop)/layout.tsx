import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";
import { getSettings } from "@/lib/settings";
import { getNavCategories } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [s, cats, user, c] = await Promise.all([getSettings(), getNavCategories().catch(() => []), getCurrentUser(), cookies()]);
  const g = s.general as Record<string, string | boolean>;
  const ads = s.ads as Record<string, string | boolean>;
  const isAdmin = user?.role === "ADMIN";
  if (g.maintenanceMode && !isAdmin) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-white p-6 text-center">
        <div className="max-w-md animate-fade-up">
          <svg className="mx-auto mb-6" width="64" height="64" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="15" fill="#111111" /><path d="M15 17l13 23 13-23" stroke="#2563EB" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1 className="text-3xl font-extrabold">{String(g.siteName)}</h1>
          <p className="mt-3 text-ink-500">{String(g.maintenanceMessage)}</p>
        </div>
      </main>
    );
  }
  const links = ((s.menu as { headerLinks?: { label: string; href: string }[] }).headerLinks ?? []).filter((l) => l.label && l.href);
  const preview = isAdmin && c.get("tm_preview")?.value === "1";
  return (
    <>
      {preview && (
        <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-3 bg-brand px-4 py-2 text-sm font-medium text-white">
          Режим предварительного просмотра: вы видите неопубликованные изменения дизайна.
          <Link href="/admin/appearance" className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand">Вернуться в редактор</Link>
        </div>
      )}
      {isAdmin && g.maintenanceMode && <div className="bg-ink py-1.5 text-center text-xs text-white">Сайт в режиме обслуживания — покупатели видят заглушку</div>}
      <Suspense fallback={<div className="h-16 border-b border-ink-100" />}>
        <Header categories={cats} links={links} topBar={ads.topBarEnabled && ads.topBarText ? { text: String(ads.topBarText), link: String(ads.topBarLink || "/") } : null} />
      </Suspense>
      <main className="min-h-[60vh] pb-6">{children}</main>
      <Footer />
    </>
  );
}
