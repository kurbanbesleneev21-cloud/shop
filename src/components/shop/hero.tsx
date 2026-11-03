"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BannerData = { id: string; title: string; subtitle: string | null; image: string | null; link: string | null; buttonText: string | null };

// Shown until the administrator adds own banners in «Внешний вид → Баннеры»
const DEFAULT_BANNERS: BannerData[] = [
  { id: "d1", title: "Электроника по честным ценам", subtitle: "Смартфоны, ноутбуки, наушники и гаджеты от проверенных продавцов", image: null, link: "/catalog", buttonText: "В каталог" },
  { id: "d2", title: "Оплата по СБП и Kaspi", subtitle: "Быстро и безопасно — без ввода данных карты", image: null, link: "/catalog?discount=1", buttonText: "Смотреть скидки" },
  { id: "d3", title: "Продавайте на TECHMARKET", subtitle: "Откройте магазин за 5 минут и получайте заказы со всей страны", image: null, link: "/seller/register", buttonText: "Стать продавцом" },
];

export function Hero({ banners: own }: { banners: BannerData[] }) {
  const banners = own.length ? own : DEFAULT_BANNERS;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const n = banners.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [n, paused, go]);

  if (!n) return null;
  const b = banners[i];
  return (
    <section
      className="relative overflow-hidden rounded-card bg-ink text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}
      aria-roledescription="carousel"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgb(var(--brand)/.55),transparent_55%),radial-gradient(circle_at_10%_100%,rgb(var(--brand)/.35),transparent_45%)]" />
      <div className="relative grid min-h-[190px] grid-cols-1 items-center gap-4 p-5 pb-9 sm:min-h-[360px] sm:p-10 md:grid-cols-[1.2fr_1fr] lg:min-h-[400px] lg:p-14">
        <AnimatePresence mode="wait">
          <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="relative z-10 max-w-xl">
            <h1 className="text-[22px] font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">{b.title}</h1>
            {b.subtitle && <p className="mt-2 line-clamp-2 text-sm text-white/75 sm:mt-4 sm:text-lg">{b.subtitle}</p>}
            <Link href={b.link || "/catalog"} className="btn-primary mt-4 h-10 text-sm sm:btn-lg sm:mt-8">{b.buttonText || "Перейти к покупкам"} <ChevronRight size={18} /></Link>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {b.image && (
            <motion.div key={b.id + "img"} initial={{ opacity: 0, scale: 0.94, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.45 }} className="pointer-events-none relative hidden h-[320px] w-full md:block">
              <Image src={b.image} alt="" fill priority={i === 0} sizes="(max-width: 768px) 60vw, 40vw" className="rounded-2xl object-contain mix-blend-normal" unoptimized={b.image.endsWith(".svg")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 md:grid" aria-label="Предыдущий слайд"><ChevronLeft /></button>
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 md:grid" aria-label="Следующий слайд"><ChevronRight /></button>
          <div className="absolute bottom-3.5 left-5 flex gap-1.5 sm:bottom-4 sm:left-10 lg:left-14">
            {banners.map((x, k) => (
              <button key={x.id} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? "w-8 bg-brand" : "w-3 bg-white/40"}`} aria-label={`Слайд ${k + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
