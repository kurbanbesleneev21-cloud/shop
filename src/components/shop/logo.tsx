"use client";

import Link from "next/link";
import { useApp } from "../providers";

/** VITRINA mark: a "V" shaped like a check mark ("выбрано"). */
export function LogoMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" className="shrink-0">
      <rect width="56" height="56" rx="15" fill={dark ? "#FFFFFF" : "#111111"} />
      <path d="M15 17l13 23 13-23" stroke="#2563EB" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const name = config.siteName || "VITRINA";
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2" aria-label={name}>
      <span className="transition group-hover:rotate-[-6deg]">
        <span className="sm:hidden"><LogoMark size={32} dark={dark} /></span>
        <span className="hidden sm:block"><LogoMark size={36} dark={dark} /></span>
      </span>
      <span className={`text-[20px] font-black tracking-tight sm:text-[23px] ${compact ? "hidden sm:inline" : ""} ${dark ? "text-white" : "text-ink"}`}>
        {name.toLowerCase() === "vitrina" ? "vitrina" : name}
      </span>
    </Link>
  );
}
