"use client";

import Link from "next/link";
import { useApp } from "../providers";

export function Logo({ dark = false, href = "/", compact = false }: { dark?: boolean; href?: string; compact?: boolean }) {
  const { config } = useApp();
  if (config.logoUrl) {
    return (
      <Link href={href} className="flex shrink-0 items-center" aria-label={config.siteName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={config.logoUrl} alt={config.siteName} className={`h-8 w-auto object-contain sm:h-9 ${compact ? "max-w-[44px] sm:max-w-[170px]" : "max-w-[170px]"}`} />
      </Link>
    );
  }
  const name = config.siteName || "TECHMARKET";
  const split = name.toUpperCase() === "TECHMARKET" ? ["TECH", "MARKET"] : [name, ""];
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2" aria-label={name}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand text-white transition group-hover:rotate-[-6deg] sm:h-9 sm:w-9">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M12 7v13" /><path d="M7 3h10" opacity=".5" /></svg>
      </span>
      <span className={`text-[19px] font-black tracking-tight sm:text-[22px] ${compact ? "hidden sm:inline" : ""} ${dark ? "text-white" : "text-ink"}`}>
        {split[0]}
        <span className="text-brand">{split[1]}</span>
      </span>
    </Link>
  );
}
