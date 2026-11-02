import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/product-card";
import { LoginPrompt } from "@/components/shop/login-prompt";

export const metadata: Metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Избранное" text="Войдите, чтобы сохранять понравившиеся товары и возвращаться к ним с любого устройства." />;
  const favs = await prisma.favorite.findMany({ where: { userId: user.id, product: { status: "PUBLISHED" } }, orderBy: { createdAt: "desc" }, select: { product: { select: cardSelect } } });
  return (
    <div className="container-tm pt-4 sm:pt-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Избранное <span className="text-lg font-semibold text-ink-400">{favs.length}</span></h1>
      {favs.length ? (
        <div className="mt-5"><ProductGrid items={favs.map((f) => f.product)} columns={5} /></div>
      ) : (
        <div className="mx-auto mt-10 max-w-md text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand"><Heart size={34} /></div>
          <h2 className="mt-4 text-xl font-bold">В избранном пока пусто</h2>
          <p className="mt-2 text-ink-500">Нажимайте ♡ на карточках товаров, чтобы не потерять их.</p>
          <Link href="/catalog" className="btn-primary mt-6">В каталог</Link>
        </div>
      )}
    </div>
  );
}
