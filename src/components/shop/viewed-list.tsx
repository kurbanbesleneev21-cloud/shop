"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ProductGrid, ProductCardSkeleton, type CardData } from "./product-card";

export function ViewedList() {
  const [items, setItems] = useState<CardData[] | null>(null);
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = (JSON.parse(localStorage.getItem("tm_recent") || "[]") as string[]).slice(0, 20);
    } catch {}
    if (!ids.length) return setItems([]);
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);
  const clear = () => {
    try {
      localStorage.removeItem("tm_recent");
    } catch {}
    setItems([]);
  };
  if (items === null) return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">{[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}</div>;
  if (!items.length)
    return (
      <div className="grid place-items-center rounded-card bg-ink-50 py-16 text-center">
        <Eye size={40} className="text-brand" />
        <h2 className="mt-3 text-xl font-bold">Вы ещё ничего не смотрели</h2>
        <p className="mt-1 text-sm text-ink-500">Здесь появятся товары, которые вы открывали</p>
        <Link href="/catalog" className="btn-primary mt-5">В каталог</Link>
      </div>
    );
  return (
    <div>
      <div className="mb-3 flex justify-end"><button onClick={clear} className="text-sm font-semibold text-ink-500 hover:text-brand">Очистить историю</button></div>
      <ProductGrid items={items} columns={4} />
    </div>
  );
}
