"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Flag, Loader2, MessageSquare, Star, Store } from "lucide-react";
import { useApp } from "../providers";
import { Stars } from "./stars";
import { ImageUploader } from "../ui/image-uploader";
import { api } from "@/lib/client-api";
import { cn, formatDate, plural } from "@/lib/utils";

export type ReviewData = { id: string; rating: number; text: string; pros: string | null; cons: string | null; photos: string[]; createdAt: string; userName: string; reply: string | null; replyAt: string | null };

export function Reviews({ productId, reviews, avg, count, dist, canReview, photosEnabled, maxMb }: { productId: string; reviews: ReviewData[]; avg: number; count: number; dist: number[]; canReview: { allowed: boolean; reason?: string }; photosEnabled: boolean; maxMb: number }) {
  const { user, openAuth, toast } = useApp();
  const router = useRouter();
  const [sort, setSort] = useState("new");
  const [filter, setFilter] = useState<number | null>(null);
  const [form, setForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [complainId, setComplainId] = useState<string | null>(null);
  const [complainText, setComplainText] = useState("");

  const list = useMemo(() => {
    let l = [...reviews];
    if (filter) l = l.filter((r) => r.rating === filter);
    if (sort === "photos") l = l.filter((r) => r.photos.length);
    l.sort((a, b) => (sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : +new Date(b.createdAt) - +new Date(a.createdAt)));
    return l;
  }, [reviews, sort, filter]);

  async function submit() {
    setErr("");
    if (!rating) return setErr("Поставьте оценку от 1 до 5");
    if (text.trim().length < 10) return setErr("Напишите отзыв — минимум 10 символов");
    setBusy(true);
    try {
      const r = await api<{ status: string }>(`/api/products/${productId}/reviews`, { body: { rating, text, pros, cons, photos } });
      toast(r.status === "APPROVED" ? "Спасибо! Отзыв опубликован" : "Спасибо! Отзыв появится после модерации");
      setForm(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function complain(id: string) {
    if (!user) return openAuth("login");
    setComplainId(complainId === id ? null : id);
    setComplainText("");
  }
  async function sendComplaint(id: string) {
    try {
      await api(`/api/reviews/${id}/complaint`, { body: { reason: complainText } });
      toast("Жалоба отправлена модератору", "info");
      setComplainId(null);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const photosAll = reviews.flatMap((r) => r.photos);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-10">
      <div>
        <div className="rounded-card bg-ink-50 p-5 lg:sticky lg:top-32">
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold">{count ? avg.toFixed(1) : "—"}</span>
            <div className="pb-1.5">
              <Stars value={avg} size={18} />
              <div className="mt-1 text-sm text-ink-500">{count} {plural(count, ["отзыв", "отзыва", "отзывов"])}</div>
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const c = dist[s - 1] || 0;
              const pct = count ? (c / count) * 100 : 0;
              return (
                <button key={s} onClick={() => setFilter(filter === s ? null : s)} className={cn("flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-sm transition hover:bg-white", filter === s && "bg-white")}>
                  <span className="w-3 font-semibold">{s}</span>
                  <Star size={13} className="text-brand" fill="currentColor" strokeWidth={0} />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200"><span className="block h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} /></span>
                  <span className="w-8 text-right text-ink-500">{c}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            {canReview.allowed ? (
              <button onClick={() => setForm((v) => !v)} className="btn-primary w-full">{form ? "Скрыть форму" : "Написать отзыв"}</button>
            ) : !user ? (
              <button onClick={() => openAuth("login")} className="btn-outline w-full">Войдите, чтобы оставить отзыв</button>
            ) : (
              <p className="rounded-xl bg-white p-3 text-sm text-ink-600">{canReview.reason}</p>
            )}
            <p className="mt-3 text-xs text-ink-500">Отзывы могут оставлять только покупатели, получившие этот товар.</p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <AnimatePresence>
          {form && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mb-6 space-y-3 rounded-card border border-brand-200 p-4 sm:p-5">
                <div className="font-bold">Ваша оценка</div>
                <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onMouseEnter={() => setHover(s)} onClick={() => setRating(s)} aria-label={`${s} из 5`} className="transition hover:scale-110">
                      <Star size={34} className={(hover || rating) >= s ? "text-brand" : "text-ink-200"} fill="currentColor" strokeWidth={0} />
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Достоинства</label><input className="input" value={pros} onChange={(e) => setPros(e.target.value)} maxLength={1000} /></div>
                  <div><label className="label">Недостатки</label><input className="input" value={cons} onChange={(e) => setCons(e.target.value)} maxLength={1000} /></div>
                </div>
                <div><label className="label">Комментарий</label><textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} placeholder="Расскажите о своём опыте использования товара" /></div>
                {photosEnabled && <ImageUploader value={photos} onChange={setPhotos} max={8} maxMb={maxMb} purpose="review" label="Добавить фото" />}
                {err && <div className="rounded-xl bg-ink-50 p-3 text-sm font-medium">{err}</div>}
                <button className="btn-primary" onClick={submit} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Опубликовать отзыв</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {photosAll.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold">Фото покупателей</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {photosAll.slice(0, 20).map((ph, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <button key={i} onClick={() => setLightbox(ph)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-50"><img src={ph} alt="" className="h-full w-full object-cover" loading="lazy" /></button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {[["new", "Сначала новые"], ["high", "Сначала положительные"], ["low", "Сначала отрицательные"], ["photos", "С фото"]].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={cn("chip h-8 shrink-0 text-xs", sort === k && "chip-active")}>{l}</button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="grid place-items-center rounded-card bg-ink-50 p-10 text-center text-ink-500"><MessageSquare className="mb-2 text-brand" />Отзывов пока нет</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {list.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand">{r.userName[0]}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{r.userName}</div>
                    <div className="flex items-center gap-2 text-xs text-ink-500"><Stars value={r.rating} size={12} /> {formatDate(r.createdAt)}</div>
                  </div>
                  <button onClick={() => complain(r.id)} className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink" title="Пожаловаться" aria-label="Пожаловаться"><Flag size={14} /></button>
                </div>
                <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
                  {r.pros && <p><span className="font-semibold">Достоинства: </span>{r.pros}</p>}
                  {r.cons && <p><span className="font-semibold">Недостатки: </span>{r.cons}</p>}
                  <p className="whitespace-pre-line text-ink-700">{r.text}</p>
                </div>
                {complainId === r.id && (
                  <div className="mt-3 flex gap-2">
                    <input className="input h-10 text-sm" placeholder="Причина: спам, оскорбления, не о товаре…" value={complainText} onChange={(e) => setComplainText(e.target.value)} maxLength={500} />
                    <button className="btn-dark btn-sm shrink-0" disabled={complainText.trim().length < 3} onClick={() => sendComplaint(r.id)}>Отправить</button>
                  </div>
                )}
                {r.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.photos.map((ph, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <button key={i} onClick={() => setLightbox(ph)} className="h-20 w-20 overflow-hidden rounded-xl bg-ink-50"><img src={ph} alt="Фото покупателя" className="h-full w-full object-cover" loading="lazy" /></button>
                    ))}
                  </div>
                )}
                {r.reply && (
                  <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-1.5 font-semibold"><Store size={14} className="text-brand" /> Ответ магазина</div>
                    <p className="text-ink-700">{r.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-ink/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-h-[88vh] max-w-full rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
