"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);
  return (
    <div className="sticky top-[106px] z-30 -mx-4 mt-10 border-b border-ink-100 bg-white/95 px-4 backdrop-blur sm:mx-0 sm:px-0 lg:top-[113px]">
      <div className="flex gap-6 overflow-x-auto scrollbar-none">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={cn("relative whitespace-nowrap py-3.5 text-sm font-semibold transition sm:text-base", active === s.id ? "text-brand" : "text-ink-500 hover:text-ink")}>
            {s.label}
            <span className={cn("absolute inset-x-0 bottom-0 h-0.5 rounded bg-brand transition-transform duration-300", active === s.id ? "scale-x-100" : "scale-x-0")} />
          </a>
        ))}
      </div>
    </div>
  );
}

export function SpecsTable({ groups }: { groups: { label: string; value: string }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? groups : groups.slice(0, 10);
  return (
    <div>
      <dl className="grid gap-x-10 md:grid-cols-2">
        {shown.map((s) => (
          <div key={s.label} className="flex items-baseline gap-2 border-b border-dashed border-ink-200 py-2.5 text-[15px]">
            <dt className="shrink-0 text-ink-500">{s.label}</dt>
            <span className="min-w-4 flex-1" />
            <dd className="text-right font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>
      {groups.length > 10 && <button onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-semibold text-brand">{all ? "Свернуть" : "Все характеристики"}</button>}
    </div>
  );
}
