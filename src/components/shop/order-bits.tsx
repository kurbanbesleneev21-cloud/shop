import { ORDER_STATUS_LABELS, cn, formatDate } from "@/lib/utils";

const STYLE: Record<string, string> = {
  NEW: "bg-brand-50 text-brand",
  CONFIRMED: "bg-brand-50 text-brand",
  PAID: "bg-brand-100 text-brand-700",
  SHIPPED: "bg-brand text-white",
  DELIVERED: "bg-ink text-white",
  CANCELLED: "bg-ink-100 text-ink-500",
  RETURN_REQUESTED: "bg-ink-200 text-ink",
  RETURNED: "bg-ink-100 text-ink-500",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", STYLE[status] ?? "bg-ink-100")}>{ORDER_STATUS_LABELS[status] ?? status}</span>;
}

const STEPS = ["NEW", "PAID", "SHIPPED", "DELIVERED"];

export function OrderProgress({ status }: { status: string }) {
  if (["CANCELLED", "RETURN_REQUESTED", "RETURNED"].includes(status)) return null;
  const idx = Math.max(0, STEPS.indexOf(status === "CONFIRMED" ? "NEW" : status));
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: i <= idx ? "100%" : "0%" }} /></div>
          <div className={cn("mt-1.5 text-[11px] font-medium", i <= idx ? "text-brand" : "text-ink-400")}>{ORDER_STATUS_LABELS[s]}</div>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ events }: { events: { id: string; status: string; note: string | null; createdAt: Date | string; actorName?: string | null }[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-ink-100 pl-5">
      {events.map((e, i) => (
        <li key={e.id} className="relative">
          <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === events.length - 1 ? "bg-brand" : "bg-ink-300")} />
          <div className="text-sm font-semibold">{ORDER_STATUS_LABELS[e.status] ?? e.status}</div>
          <div className="text-xs text-ink-500">{formatDate(e.createdAt, true)}{e.actorName ? ` · ${e.actorName}` : ""}</div>
          {e.note && <div className="mt-0.5 text-sm text-ink-600">{e.note}</div>}
        </li>
      ))}
    </ol>
  );
}
