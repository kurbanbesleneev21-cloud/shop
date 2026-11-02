"use client";

import { useEffect, useState } from "react";
import { ProductRail } from "./rail";
import type { CardData } from "./product-card";

export function RecentlyViewed({ excludeId, title = "Вы недавно смотрели" }: { excludeId?: string; title?: string }) {
  const [items, setItems] = useState<CardData[]>([]);
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = (JSON.parse(localStorage.getItem("tm_recent") || "[]") as string[]).filter((x) => x !== excludeId).slice(0, 12);
    } catch {}
    if (!ids.length) return;
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => undefined);
  }, [excludeId]);
  return <ProductRail title={title} items={items} />;
}
