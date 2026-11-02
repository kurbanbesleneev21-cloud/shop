"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, type CardData } from "./product-card";

export function ProductRail({ title, items, href }: { title: string; items: CardData[]; href?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="h-section">{title}</h2>
        <div className="flex items-center gap-2">
          {href && <Link href={href} className="text-sm font-semibold text-brand hover:text-brand-600">Смотреть все</Link>}
          <button onClick={() => scroll(-1)} className="hidden h-9 w-9 place-items-center rounded-full border border-ink-200 transition hover:border-brand hover:text-brand sm:grid" aria-label="Назад"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll(1)} className="hidden h-9 w-9 place-items-center rounded-full border border-ink-200 transition hover:border-brand hover:text-brand sm:grid" aria-label="Вперёд"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 pb-2 scrollbar-none sm:mx-0 sm:gap-4 sm:px-0">
        {items.map((p, i) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start xs:w-[44%] sm:w-[31%] md:w-[23.5%] lg:w-[19%]">
            <ProductCard p={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
