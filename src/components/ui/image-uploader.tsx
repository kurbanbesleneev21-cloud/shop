"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, ImagePlus, Loader2, RefreshCw, Star, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif";

type Pending = { id: string; name: string; progress: number; preview: string; error?: string };

/** Client-side optimisation: downscale big photos and re-encode to WebP so uploads stay small and fast on mobile networks. */
async function optimize(file: File, maxSide = 2000): Promise<Blob> {
  if (file.type === "image/avif" && file.size < 3_000_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.88));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function uploadOne(blob: Blob, name: string, purpose: string, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", blob, name);
    fd.append("purpose", purpose);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
        else reject(new Error(data.error || "Ошибка загрузки"));
      } catch {
        reject(new Error("Ошибка загрузки"));
      }
    };
    xhr.onerror = () => reject(new Error("Сеть недоступна"));
    xhr.timeout = 120_000;
    xhr.ontimeout = () => reject(new Error("Загрузка заняла слишком много времени"));
    xhr.onabort = () => reject(new Error("Загрузка прервана"));
    xhr.send(fd);
  });
}

export function ImageUploader({ value, onChange, max = 15, maxMb = 10, purpose = "product", label = "Загрузить фотографию" }: { value: string[]; onChange: (v: string[]) => void; max?: number; maxMb?: number; purpose?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  async function handle(files: FileList | File[], replaceAt?: number) {
    const errs: string[] = [];
    const list = Array.from(files);
    const room = replaceAt !== undefined ? 1 : max - value.length;
    if (list.length > room) errs.push(`Можно добавить ещё ${Math.max(0, room)} фото (максимум ${max})`);
    const valid = list.slice(0, Math.max(0, room)).filter((f) => {
      if (!ACCEPT.includes(f.type) && !/\.(jpe?g|png|webp|avif)$/i.test(f.name)) {
        errs.push(`${f.name}: неподдерживаемый формат (JPG, PNG, WebP, AVIF)`);
        return false;
      }
      if (f.size > maxMb * 1024 * 1024) {
        errs.push(`${f.name}: файл больше ${maxMb} МБ`);
        return false;
      }
      return true;
    });
    setErrors(errs);
    await Promise.all(
      valid.map(async (f) => {
        const id = Math.random().toString(36).slice(2);
        const p: Pending = { id, name: f.name, progress: 0, preview: URL.createObjectURL(f) };
        setPending((x) => [...x, p]);
        try {
          const blob = await optimize(f);
          const url = await uploadOne(blob, f.name.replace(/\.\w+$/, blob.type === "image/webp" ? ".webp" : "$&"), purpose, (prog) => setPending((x) => x.map((y) => (y.id === id ? { ...y, progress: prog } : y))));
          // update the ref synchronously: parallel uploads must not overwrite each other
          const next = replaceAt !== undefined ? valueRef.current.map((u, k) => (k === replaceAt ? url : u)) : [...valueRef.current, url];
          valueRef.current = next;
          onChange(next);
          setPending((x) => x.filter((y) => y.id !== id));
        } catch (e) {
          setPending((x) => x.map((y) => (y.id === id ? { ...y, error: (e as Error).message } : y)));
          setErrors((x) => [...x, `${f.name}: ${(e as Error).message}`]);
          setTimeout(() => setPending((x) => x.filter((y) => y.id !== id)), 5000);
        } finally {
          URL.revokeObjectURL(p.preview);
        }
      }),
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) handle(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-4 py-7 text-center transition", drag ? "border-brand bg-brand-50" : "border-ink-200 bg-ink-50")}
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-card"><ImagePlus /></span>
        <div>
          <div className="font-semibold">Перетащите фотографии сюда</div>
          <div className="text-sm text-ink-500">или выберите из галереи телефона или компьютера · JPG, PNG, WebP, AVIF до {maxMb} МБ</div>
        </div>
        <button type="button" onClick={() => input.current?.click()} className="btn-primary" disabled={value.length >= max}>
          <Upload size={18} /> {label}
        </button>
        <input ref={input} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={(e) => { if (e.target.files) handle(e.target.files); e.target.value = ""; }} />
        <input ref={replaceInput} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => { if (e.target.files && replaceIdx !== null) handle(e.target.files, replaceIdx); e.target.value = ""; }} />
        <div className="text-xs text-ink-400">{value.length} / {max} фото{value.length > 0 && " · первое фото — главное"}</div>
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-xl border border-ink-200 bg-white p-3 text-sm">
          {errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}

      {(value.length > 0 || pending.length > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragIdx !== null && dragIdx !== i) move(dragIdx, i);
                setDragIdx(null);
              }}
              className={cn("group relative aspect-square overflow-hidden rounded-xl border-2 bg-ink-50 transition", i === 0 ? "border-brand" : "border-ink-100", dragIdx === i && "opacity-40")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">Главное</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-ink/70 to-transparent p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <IconBtn title="Влево" onClick={() => move(i, i - 1)} disabled={i === 0}><ArrowLeft size={14} /></IconBtn>
                {i !== 0 && <IconBtn title="Сделать главным" onClick={() => move(i, 0)}><Star size={14} /></IconBtn>}
                <IconBtn title="Просмотр" onClick={() => setPreview(i)}><Eye size={14} /></IconBtn>
                <IconBtn title="Заменить" onClick={() => { setReplaceIdx(i); replaceInput.current?.click(); }}><RefreshCw size={14} /></IconBtn>
                <IconBtn title="Удалить" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 size={14} /></IconBtn>
                <IconBtn title="Вправо" onClick={() => move(i, i + 1)} disabled={i === value.length - 1}><ArrowRight size={14} /></IconBtn>
              </div>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border-2 border-brand-200 bg-ink-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-contain opacity-50" />
              <div className="absolute inset-0 grid place-items-center p-2 text-center">
                {p.error ? (
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-medium">{p.error}</span>
                ) : (
                  <div className="w-full px-2">
                    <Loader2 className="mx-auto animate-spin text-brand" size={20} />
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full bg-brand transition-all" style={{ width: `${p.progress}%` }} /></div>
                    <div className="mt-1 text-[11px] font-semibold text-brand">{p.progress}%</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {preview !== null && value[preview] && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-ink/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value[preview]} alt="" className="max-h-[85vh] max-w-full rounded-xl bg-white object-contain" />
            <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Закрыть"><X /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-ink transition hover:bg-brand hover:text-white disabled:opacity-30">
      {children}
    </button>
  );
}
