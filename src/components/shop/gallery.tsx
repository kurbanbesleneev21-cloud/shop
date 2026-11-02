"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn } from "lucide-react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";

export function Gallery({ images, title }: { images: { url: string; alt: string | null }[]; title: string }) {
  const list = images.length ? images : [{ url: "/products/phone-black-front.svg", alt: title }];
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touch = useRef<number | null>(null);
  const n = list.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full, go]);

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touch.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touch.current == null) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touch.current = null;
    },
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="flex gap-2 overflow-x-auto scrollbar-none md:max-h-[540px] md:flex-col md:overflow-y-auto">
        {list.map((img, k) => (
          <button key={img.url + k} onClick={() => setI(k)} onMouseEnter={() => setI(k)} className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-50 transition md:h-20 md:w-20", k === i ? "border-brand" : "border-transparent hover:border-ink-200")} aria-label={`Фото ${k + 1}`}>
            <ProductImage src={img.url} alt="" sizes="80px" />
          </button>
        ))}
      </div>
      <div
        className="group relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-card bg-ink-50"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setFull(true)}
        {...swipe}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0">
            <div className="absolute inset-0 transition-transform duration-200 ease-out" style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
              <ProductImage src={list[i].url} alt={list[i].alt || title} priority={i === 0} sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold shadow-card">{i + 1} / {n}</div>
        <div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-card md:flex"><ZoomIn size={14} /> Наведите для увеличения</div>
        <button onClick={(e) => { e.stopPropagation(); setFull(true); }} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-card" aria-label="Полноэкранный просмотр"><Maximize2 size={16} /></button>
        {n > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
            {list.map((_, k) => <span key={k} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-brand" : "w-1.5 bg-ink-300")} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {full && (
          <motion.div className="fixed inset-0 z-[95] flex flex-col bg-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Просмотр фотографий">
            <div className="flex items-center justify-between p-4 text-white">
              <span className="line-clamp-1 text-sm text-white/70">{title} · {i + 1} из {n}</span>
              <button onClick={() => setFull(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Закрыть"><X /></button>
            </div>
            <div className="relative flex-1" {...swipe}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-4 md:inset-10">
                  <ProductImage src={list[i].url} alt={list[i].alt || title} sizes="100vw" />
                </motion.div>
              </AnimatePresence>
              {n > 1 && (
                <>
                  <button onClick={() => go(-1)} className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25" aria-label="Предыдущее"><ChevronLeft /></button>
                  <button onClick={() => go(1)} className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25" aria-label="Следующее"><ChevronRight /></button>
                </>
              )}
            </div>
            <div className="flex justify-center gap-2 overflow-x-auto p-4">
              {list.map((img, k) => (
                <button key={k} onClick={() => setI(k)} className={cn("relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white", k === i ? "border-brand" : "border-transparent opacity-60")}>
                  <ProductImage src={img.url} alt="" sizes="56px" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
