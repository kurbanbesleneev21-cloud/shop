import Link from "next/link";
import { cn } from "@/lib/utils";

export function PeriodTabs({ value, base }: { value: string; base: string }) {
  return (
    <div className="flex rounded-xl bg-white p-1 shadow-card">
      {[["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]].map(([k, l]) => (
        <Link key={k} href={`${base}?period=${k}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", value === k ? "bg-brand text-white" : "text-ink-500 hover:text-ink")}>{l}</Link>
      ))}
    </div>
  );
}
