"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";

export function ListFilters({ selects = [], placeholder = "Поиск" }: { selects?: { name: string; label: string; options: [string, string][] }[]; placeholder?: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const go = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    n.delete("page");
    start(() => router.push(`${path}?${n.toString()}`));
  };
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <form onSubmit={(e) => { e.preventDefault(); go({ q }); }} className="relative min-w-[220px] flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input bg-white pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        {pending && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-brand" />}
      </form>
      {selects.map((s) => (
        <select key={s.name} className="input w-auto bg-white" value={sp.get(s.name) ?? ""} onChange={(e) => go({ [s.name]: e.target.value })} aria-label={s.label}>
          <option value="">{s.label}</option>
          {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ))}
    </div>
  );
}

export function Pager({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  if (pages <= 1) return null;
  const go = (p: number) => {
    const n = new URLSearchParams(sp.toString());
    n.set("page", String(p));
    router.push(`${path}?${n.toString()}`);
  };
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => go(page - 1)}>Назад</button>
      <span className="text-sm text-ink-500">Стр. {page} из {pages}</span>
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => go(page + 1)}>Вперёд</button>
    </div>
  );
}
