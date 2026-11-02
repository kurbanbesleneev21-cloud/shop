"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

export function AreaChart({ data, height = 240, format = "money" }: { data: { label: string; value: number }[]; height?: number; format?: "money" | "number" }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 800;
  const h = height;
  const pad = { t: 16, r: 12, b: 28, l: 12 };
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const n = Math.max(1, data.length - 1);
  const x = (i: number) => pad.l + (i / n) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`;
  const fmt = (v: number) => (format === "money" ? formatPrice(v) : String(v));
  const step = Math.ceil(data.length / 8);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--brand))" stopOpacity=".28" />
            <stop offset="1" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad.l} x2={w - pad.r} y1={y(max * g / 1.1)} y2={y(max * g / 1.1)} stroke="rgb(var(--ink) / .07)" />)}
        <path d={area} fill="url(#area)" className="animate-fade-up" />
        <path d={line} fill="none" stroke="rgb(var(--brand))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ ["--len" as string]: 1 }} className="animate-draw" />
        {data.map((d, i) => (
          <g key={i}>
            <rect x={x(i) - (w / data.length) / 2} y={0} width={w / data.length} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % step === 0 && <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="rgb(var(--ink) / .45)">{d.label}</text>}
          </g>
        ))}
        {hover !== null && data[hover] && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} stroke="rgb(var(--brand) / .4)" strokeDasharray="4 4" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="rgb(var(--brand))" stroke="white" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift" style={{ left: `${(x(hover) / w) * 100}%`, transform: "translateX(-50%)" }}>
          <div className="text-white/60">{data[hover].label}</div>
          <div className="font-bold">{fmt(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

export function BarList({ items, format = "number" }: { items: { label: string; value: number; sub?: string }[]; format?: "money" | "number" }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i, k) => (
        <li key={k}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="line-clamp-1">{i.label}</span><span className="shrink-0 font-semibold">{format === "money" ? formatPrice(i.value) : i.value}{i.sub ? <span className="ml-1 font-normal text-ink-400">{i.sub}</span> : null}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full origin-left animate-grow rounded-full bg-brand" style={{ width: `${(i.value / max) * 100}%`, animationDelay: `${k * 60}ms`, transformOrigin: "left", animationName: "growX" }} /></div>
        </li>
      ))}
      <style>{`@keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
    </ul>
  );
}

export function Columns({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <div className="relative w-full flex-1">
            <div className="absolute inset-x-0 bottom-0 origin-bottom animate-grow rounded-t-md bg-brand-200 transition group-hover:bg-brand" style={{ height: `${(d.value / max) * 100}%`, animationDelay: `${i * 30}ms` }} title={`${d.label}: ${d.value}`} />
          </div>
          <span className="text-[10px] text-ink-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
