"use client";

import Link from "next/link";
import { cloneElement, isValidElement, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Eye, ExternalLink, Loader2, Plus, Save, Send, Trash2, X, Sparkles } from "lucide-react";
import { useApp } from "../providers";
import { ImageUploader } from "../ui/image-uploader";
import { useDialog } from "../use-dialog";
import { ProductCard } from "../shop/product-card";
import { api } from "@/lib/client-api";
import { cn, discountPercent, formatPrice, slugify } from "@/lib/utils";

export type SpecTpl = { key: string; label: string; filter?: string };
export type EditorCategory = { id: string; name: string; parent?: string | null; specTemplate: SpecTpl[] };
export type EditorProduct = {
  id?: string; title: string; slug: string; sku: string; model: string; brandId: string; categoryId: string; sellerId: string;
  price: number | ""; oldPrice: number | ""; stock: number | ""; status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  shortDescription: string; description: string; advantages: string[]; features: string[]; equipment: string[]; manufacturerInfo: string;
  specs: Record<string, string>; isNew: boolean; isHit: boolean; featured: boolean; seoTitle: string; seoDescription: string; keywords: string;
  images: string[]; aiGenerated?: boolean;
};

export const emptyProduct: EditorProduct = {
  title: "", slug: "", sku: "", model: "", brandId: "", categoryId: "", sellerId: "", price: "", oldPrice: "", stock: 0, status: "DRAFT",
  shortDescription: "", description: "", advantages: [], features: [], equipment: [], manufacturerInfo: "", specs: {},
  isNew: false, isHit: false, featured: false, seoTitle: "", seoDescription: "", keywords: "", images: [],
};

const TABS = [
  ["main", "Основное"],
  ["photos", "Фотографии"],
  ["description", "Описание"],
  ["specs", "Характеристики"],
  ["seo", "SEO"],
] as const;

// New products are created through a step-by-step wizard; existing ones are edited with tabs
const STEPS = [
  ["main", "Основное", "Название, категория и цена"],
  ["photos", "Фото", "Покупатели сначала смотрят на фото"],
  ["description", "Описание", "Расскажите о товаре"],
  ["specs", "Характеристики", "По ним покупатели фильтруют каталог"],
  ["review", "Проверка", "Проверьте и опубликуйте"],
] as const;
type Step = (typeof TABS)[number][0] | "review";

export function ProductEditor({ initial, categories, brands, sellers, mode, maxPhotos = 15, maxMb = 10, onSaved, notice }: {
  initial: EditorProduct; categories: EditorCategory[]; brands: { id: string; name: string }[]; sellers: { id: string; shopName: string }[] | null;
  mode: "admin" | "seller"; maxPhotos?: number; maxMb?: number; onSaved?: (id: string) => void; notice?: React.ReactNode;
}) {
  const { toast, config } = useApp();
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(initial);
  const wizard = !initial.id;
  const [tab, setTab] = useState<Step>("main");
  const stepIdx = STEPS.findIndex(([k]) => k === tab);
  const [busy, setBusy] = useState<string>("");
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSpec, setNewSpec] = useState({ key: "", value: "" });
  const [discountInput, setDiscountInput] = useState("");

  const category = categories.find((c) => c.id === p.categoryId);
  const tpl = category?.specTemplate ?? [];
  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const disc = discountPercent(Number(p.price) || 0, Number(p.oldPrice) || null);
  const base = mode === "admin" ? "/admin/products" : "/seller/products";

  function validate() {
    const e: Record<string, string> = {};
    if (p.title.trim().length < 3) e.title = "Введите название";
    if (!p.categoryId) e.categoryId = "Выберите категорию";
    if (!p.price || Number(p.price) <= 0) e.price = "Укажите цену";
    if (p.oldPrice && Number(p.oldPrice) <= Number(p.price)) e.oldPrice = "Старая цена должна быть больше текущей";
    setErrors(e);
    if (e.title || e.categoryId || e.price || e.oldPrice) setTab("main");
    return !Object.keys(e).length;
  }

  function next() {
    if (tab === "main" && !validate()) {
      toast("Заполните обязательные поля: название, категорию и цену", "error");
      return;
    }
    const n = STEPS[stepIdx + 1];
    if (n) {
      setTab(n[0]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function back() {
    const n = STEPS[stepIdx - 1];
    if (n) {
      setTab(n[0]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function payload(status: EditorProduct["status"]) {
    const filters: Record<string, string> = {};
    for (const t of tpl) if (t.filter && p.specs[t.key]) filters[t.filter] = p.specs[t.key];
    return {
      ...p,
      status,
      price: Number(p.price),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      stock: Number(p.stock) || 0,
      brandId: p.brandId || null,
      sellerId: p.sellerId || null,
      color: filters.color ?? null,
      memory: filters.memory ?? null,
      diagonal: filters.diagonal ?? null,
      processor: filters.processor ?? null,
      images: p.images.map((url, i) => ({ url, alt: `${p.title} — фото ${i + 1}` })),
    };
  }

  async function save(status: EditorProduct["status"]) {
    if (!validate()) return;
    setBusy(status);
    try {
      const r = await api<{ id: string; slug: string; status: string; moderated: boolean }>(p.id ? `/api/manage/products/${p.id}` : "/api/manage/products", { method: p.id ? "PUT" : "POST", body: payload(status) });
      setP((x) => ({ ...x, id: r.id, slug: r.slug, status: r.status as EditorProduct["status"] }));
      toast(r.moderated ? "Товар отправлен на модерацию" : status === "PUBLISHED" ? "Товар опубликован и виден в каталоге" : "Сохранено");
      if (onSaved) onSaved(r.id);
      else if (!p.id) router.replace(`${base}/${r.id}`);
      router.refresh();
    } catch (e) {
      const err = e as Error & { data?: { fields?: Record<string, string[]> } };
      if (err.data?.fields) setErrors(Object.fromEntries(Object.entries(err.data.fields).map(([k, v]) => [k, v?.[0] ?? ""])));
      toast(err.message, "error");
    } finally {
      setBusy("");
    }
  }

  const card = useMemo(
    () => ({ id: p.id ?? "preview", title: p.title || "Название товара", slug: p.slug || "preview", price: Number(p.price) || 0, oldPrice: Number(p.oldPrice) || null, rating: 0, reviewsCount: 0, stock: Number(p.stock) || 0, isNew: p.isNew, isHit: p.isHit, brand: brands.find((b) => b.id === p.brandId) ? { name: brands.find((b) => b.id === p.brandId)!.name } : null, images: p.images.map((url) => ({ url })) }),
    [p, brands],
  );

  return (
    <div className="pb-24">
      {notice}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", p.status === "PUBLISHED" ? "bg-brand text-white" : p.status === "HIDDEN" ? "bg-ink-200" : "bg-ink-100")}>{p.status === "PUBLISHED" ? "Опубликован" : p.status === "HIDDEN" ? "Скрыт" : "Черновик"}</span>
          {p.aiGenerated && <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand"><Sparkles size={12} />AI</span>}
        </div>
        <button onClick={() => setPreview(true)} className="btn-outline btn-sm"><Eye size={16} />Предпросмотр</button>
        {p.id && <Link href={`/product/${p.slug}`} target="_blank" className="btn-outline btn-sm"><ExternalLink size={16} />На сайте</Link>}
      </div>

      {wizard ? (
        <div className="mt-4">
          <ol className="flex gap-1.5">
            {STEPS.map(([k, l], i) => (
              <li key={k} className="flex-1">
                <button type="button" onClick={() => (i < stepIdx || (i > stepIdx && (stepIdx > 0 || validate()))) && setTab(k)} className="w-full text-left" aria-current={tab === k ? "step" : undefined}>
                  <span className={cn("block h-1.5 rounded-full transition-colors", i <= stepIdx ? "bg-brand" : "bg-ink-100")} />
                  <span className={cn("mt-1.5 hidden text-xs font-semibold sm:block", i === stepIdx ? "text-brand" : i < stepIdx ? "text-ink" : "text-ink-400")}>{i + 1}. {l}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">Шаг {stepIdx + 1} из {STEPS.length}</div>
            <h2 className="text-xl font-extrabold">{STEPS[stepIdx][1]}</h2>
            <p className="text-sm text-ink-500">{STEPS[stepIdx][2]}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-ink-100 scrollbar-none">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("relative shrink-0 px-3.5 py-2.5 text-sm font-semibold transition", tab === k ? "text-brand" : "text-ink-500 hover:text-ink")}>
            {l}
            {k === "photos" && p.images.length > 0 && <span className="ml-1 text-xs text-ink-400">{p.images.length}</span>}
            {tab === k && <motion.span layoutId="editor-tab" className="absolute inset-x-0 bottom-0 h-0.5 rounded bg-brand" />}
          </button>
        ))}
      </div>
      )}

      <div className="mt-5">
        {tab === "main" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Основная информация">
              <F label="Название товара *" error={errors.title}><input className="input" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="Например, Apple iPhone 16 128 ГБ" /></F>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Категория *" error={errors.categoryId}>
                  <select className="input" value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                    <option value="">Выберите…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent} → ` : ""}{c.name}</option>)}
                  </select>
                </F>
                <F label="Бренд">
                  <select className="input" value={p.brandId} onChange={(e) => set("brandId", e.target.value)}>
                    <option value="">Без бренда</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </F>
                <F label="Модель"><input className="input" value={p.model} onChange={(e) => set("model", e.target.value)} /></F>
                <F label="Артикул (SKU)" hint="Пусто — сгенерируется"><input className="input" value={p.sku} onChange={(e) => set("sku", e.target.value)} placeholder="TM-000000" /></F>
              </div>
              <F label="Адрес страницы (slug)" hint={`/product/${p.slug || slugify(p.title || "nazvanie")}`}><input className="input" value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="Сформируется из названия" /></F>
              {sellers && (
                <F label="Продавец">
                  <select className="input" value={p.sellerId} onChange={(e) => set("sellerId", e.target.value)}>
                    <option value="">Маркетплейс (без продавца)</option>
                    {sellers.map((s) => <option key={s.id} value={s.id}>{s.shopName}</option>)}
                  </select>
                </F>
              )}
            </Card>
            <div className="space-y-5">
              <Card title="Цена и склад">
                <div className="grid gap-3 sm:grid-cols-3">
                  <F label="Цена, ₽ *" error={errors.price}><input className="input" inputMode="numeric" value={p.price} onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value.replace(/\D/g, "")))} /></F>
                  <F label="Старая цена, ₽" error={errors.oldPrice}><input className="input" inputMode="numeric" value={p.oldPrice} onChange={(e) => set("oldPrice", e.target.value === "" ? "" : Number(e.target.value.replace(/\D/g, "")))} /></F>
                  <F label="Остаток, шт."><input className="input" inputMode="numeric" value={p.stock} onChange={(e) => set("stock", e.target.value === "" ? "" : Number(e.target.value.replace(/\D/g, "")))} /></F>
                </div>
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-ink-50 p-3">
                  <div className="text-sm">Скидка: <b className="text-brand">{disc ? `${disc}%` : "нет"}</b>{disc > 0 && <> · выгода {formatPrice(Number(p.oldPrice) - Number(p.price), config.currency)}</>}</div>
                  <div className="ml-auto flex items-center gap-2">
                    <input className="input h-9 w-20 text-sm" placeholder="%" value={discountInput} onChange={(e) => setDiscountInput(e.target.value.replace(/\D/g, ""))} />
                    <button type="button" className="btn-soft btn-sm" onClick={() => {
                      const d = Number(discountInput);
                      const basePrice = Number(p.oldPrice) || Number(p.price);
                      if (!d || !basePrice || d >= 100) return;
                      setP((x) => ({ ...x, oldPrice: basePrice, price: Math.round(basePrice * (1 - d / 100)) }));
                    }}>Применить скидку</button>
                  </div>
                </div>
              </Card>
              <Card title={wizard ? "Метки" : "Публикация и метки"}>
                <div className={cn("grid grid-cols-3 gap-2", wizard && "hidden")}>
                  {(["DRAFT", "PUBLISHED", "HIDDEN"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => set("status", s)} className={cn("rounded-xl border-2 px-2 py-2.5 text-sm font-semibold transition", p.status === s ? "border-brand bg-brand-50 text-brand" : "border-ink-100")}>
                      {s === "DRAFT" ? "Черновик" : s === "PUBLISHED" ? "Опубликован" : "Скрыт"}
                    </button>
                  ))}
                </div>
                <Toggle label="Новинка" value={p.isNew} onChange={(v) => set("isNew", v)} />
                {mode === "admin" && <Toggle label="Хит продаж" value={p.isHit} onChange={(v) => set("isHit", v)} />}
                {mode === "admin" && <Toggle label="Рекомендуемый (блок на главной)" value={p.featured} onChange={(v) => set("featured", v)} />}
              </Card>
            </div>
          </div>
        )}

        {tab === "photos" && (
          <Card title="Фотографии товара" subtitle="Первая фотография — главная. Перетаскивайте для изменения порядка.">
            <ImageUploader value={p.images} onChange={(v) => set("images", v)} max={maxPhotos} maxMb={maxMb} purpose="product" />
          </Card>
        )}

        {tab === "description" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Описание">
              <F label="Краткое описание" hint={`${p.shortDescription.length}/600`}><textarea className="textarea min-h-[80px]" maxLength={600} value={p.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></F>
              <F label="Полное описание"><textarea className="textarea min-h-[220px]" value={p.description} onChange={(e) => set("description", e.target.value)} /></F>
              <F label="Информация о производителе"><textarea className="textarea min-h-[80px]" value={p.manufacturerInfo} onChange={(e) => set("manufacturerInfo", e.target.value)} /></F>
            </Card>
            <Card title="Списки">
              <Lines label="Преимущества" value={p.advantages} onChange={(v) => set("advantages", v)} />
              <Lines label="Особенности" value={p.features} onChange={(v) => set("features", v)} />
              <Lines label="Комплектация" value={p.equipment} onChange={(v) => set("equipment", v)} />
            </Card>
          </div>
        )}

        {tab === "specs" && (
          <Card title="Технические характеристики" subtitle={category ? `Шаблон категории «${category.name}». Поля с меткой «фильтр» используются в фильтрах каталога.` : "Сначала выберите категорию на вкладке «Основное»"}>
            <div className="grid gap-3 sm:grid-cols-2">
              {tpl.map((t) => (
                <F key={t.key} label={t.label} hint={t.filter ? "фильтр" : undefined}>
                  <input className="input" value={p.specs[t.key] ?? ""} onChange={(e) => set("specs", { ...p.specs, [t.key]: e.target.value })} />
                </F>
              ))}
            </div>
            {Object.entries(p.specs).filter(([k]) => !tpl.some((t) => t.key === k)).map(([k, v]) => (
              <div key={k} className="flex items-end gap-2">
                <F label={k}><input className="input" value={v} onChange={(e) => set("specs", { ...p.specs, [k]: e.target.value })} /></F>
                <button type="button" className="btn-ghost h-11 w-11 px-0" onClick={() => { const n = { ...p.specs }; delete n[k]; set("specs", n); }} aria-label="Удалить"><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-2 rounded-xl bg-ink-50 p-3">
              <div className="min-w-[140px] flex-1"><label className="label">Своя характеристика</label><input className="input" value={newSpec.key} onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })} placeholder="Название" /></div>
              <div className="min-w-[140px] flex-1"><label className="label">Значение</label><input className="input" value={newSpec.value} onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })} /></div>
              <button type="button" className="btn-soft" onClick={() => { if (newSpec.key.trim()) { set("specs", { ...p.specs, [newSpec.key.trim()]: newSpec.value }); setNewSpec({ key: "", value: "" }); } }}><Plus size={16} />Добавить</button>
            </div>
          </Card>
        )}

        {tab === "review" && (
          <div className="grid gap-5 md:grid-cols-[240px_1fr]">
            <div className="order-2 mx-auto w-full max-w-[220px] md:order-none md:mx-0"><div className="mb-2 text-xs font-semibold uppercase text-ink-400">Так товар увидят в каталоге</div><ProductCard p={card} /></div>
            <Card title="Проверка перед публикацией">
              {[
                [p.title.trim().length >= 3, "Название", "main"],
                [Boolean(p.categoryId), "Категория", "main"],
                [Number(p.price) > 0, "Цена", "main"],
                [Number(p.stock) > 0, "Остаток на складе больше 0", "main"],
                [p.images.length > 0, `Фотографии${p.images.length ? ` (${p.images.length})` : ""}`, "photos"],
                [p.description.trim().length > 30 || p.shortDescription.trim().length > 10, "Описание", "description"],
                [Object.values(p.specs).filter(Boolean).length >= Math.min(3, tpl.length || 1), "Характеристики", "specs"],
              ].map(([okv, label, step]) => (
                <button type="button" key={label as string} onClick={() => setTab(step as Step)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-ink-50">
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", okv ? "bg-brand text-white" : "bg-ink-100 text-ink-500")}>{okv ? "✓" : "!"}</span>
                  <span className={cn("flex-1 text-sm", !okv && "text-ink-500")}>{label as string}</span>
                  {!okv && <span className="text-xs font-semibold text-brand">Заполнить</span>}
                </button>
              ))}
              <p className="text-xs text-ink-500">{mode === "seller" ? "После отправки товар проверит модератор, обычно это занимает до 24 часов." : "Товар сразу появится в каталоге."} SEO-поля заполнятся автоматически, их можно изменить позже.</p>
            </Card>
          </div>
        )}

        {tab === "seo" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="SEO">
              <F label="SEO-заголовок" hint={`${p.seoTitle.length}/70`}><input className="input" value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={p.title} /></F>
              <F label="SEO-описание" hint={`${p.seoDescription.length}/160`}><textarea className="textarea min-h-[90px]" value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></F>
              <F label="Ключевые слова (через запятую)"><input className="input" value={p.keywords} onChange={(e) => set("keywords", e.target.value)} /></F>
            </Card>
            <Card title="Как будет выглядеть в поиске">
              <div className="rounded-xl border border-ink-100 p-4">
                <div className="text-xs text-ink-500">techmarket › product › {p.slug || slugify(p.title || "tovar")}</div>
                <div className="mt-1 line-clamp-1 text-lg text-brand">{p.seoTitle || p.title || "Заголовок страницы"}</div>
                <div className="mt-1 line-clamp-2 text-sm text-ink-600">{p.seoDescription || p.shortDescription || "Описание страницы для поисковых систем."}</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur", mode === "admin" ? "lg:left-[260px]" : "bottom-[60px] md:bottom-0")}>
        {wizard ? (
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
            {stepIdx > 0 ? <button type="button" className="btn-outline" onClick={back}>Назад</button> : <Link href={base} className="btn-ghost">Отмена</Link>}
            <div className="ml-auto flex gap-2">
              {stepIdx > 0 && <button type="button" className="btn-outline hidden sm:inline-flex" disabled={!!busy} onClick={() => save("DRAFT")}>{busy === "DRAFT" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}В черновик</button>}
              {tab !== "review" ? (
                <button type="button" className="btn-primary min-w-[120px]" onClick={next}>Далее</button>
              ) : (
                <button type="button" className="btn-primary" disabled={!!busy} onClick={() => save("PUBLISHED")}>{busy === "PUBLISHED" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{mode === "seller" ? "Отправить на проверку" : "Опубликовать"}</button>
              )}
            </div>
          </div>
        ) : (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3">
          {Object.values(errors).some(Boolean) && <span className="mr-auto text-sm font-medium">Проверьте обязательные поля</span>}
          <button className="btn-outline" onClick={() => setPreview(true)}><Eye size={16} /><span className="hidden sm:inline">Предпросмотр</span></button>
          <button className="btn-outline" disabled={!!busy} onClick={() => save(p.status === "PUBLISHED" ? "PUBLISHED" : p.status)}>{busy && busy !== "PUBLISHED" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Сохранить</button>
          {p.status !== "PUBLISHED" && <button className="btn-primary" disabled={!!busy} onClick={() => save("PUBLISHED")}>{busy === "PUBLISHED" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{mode === "seller" ? "Отправить на публикацию" : "Опубликовать"}</button>}
        </div>
        )}
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div className="fixed inset-0 z-[90] overflow-y-auto bg-ink/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(false)}>
            <PreviewDialog onClose={() => setPreview(false)}>
              <div className="mb-4 flex items-center justify-between"><span className="text-lg font-bold">Предпросмотр карточки</span><button onClick={() => setPreview(false)} aria-label="Закрыть предпросмотр" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100"><X /></button></div>
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div><div className="mb-2 text-xs font-semibold uppercase text-ink-400">В каталоге</div><ProductCard p={card} /></div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase text-ink-400">На странице товара</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="aspect-square overflow-hidden rounded-card bg-ink-50">
                      {p.images[0] ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0]} alt="" className="h-full w-full object-contain" />) : <div className="grid h-full place-items-center text-ink-400">Нет фото</div>}
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase text-brand">{card.brand?.name}</div>
                      <h2 className="text-xl font-extrabold">{card.title}</h2>
                      <div className="mt-1 text-xs text-ink-500">Артикул: {p.sku || "будет присвоен"}</div>
                      <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl font-extrabold text-brand">{formatPrice(card.price, config.currency)}</span>{card.oldPrice && <span className="text-ink-400 line-through">{formatPrice(card.oldPrice, config.currency)}</span>}</div>
                      <p className="mt-3 text-sm text-ink-600">{p.shortDescription}</p>
                      <dl className="mt-3 space-y-1 text-sm">{tpl.filter((t) => p.specs[t.key]).slice(0, 6).map((t) => <div key={t.key} className="flex gap-2"><dt className="text-ink-500">{t.label}:</dt><dd>{p.specs[t.key]}</dd></div>)}</dl>
                    </div>
                  </div>
                  {p.description && <p className="mt-4 whitespace-pre-line text-sm text-ink-700">{p.description}</p>}
                  {p.advantages.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm">{p.advantages.map((a) => <li key={a}>{a}</li>)}</ul>}
                </div>
              </div>
            </PreviewDialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useDialog(true, onClose);
  return (
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-label="Предпросмотр карточки" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="mx-auto max-w-5xl rounded-3xl bg-white p-5 sm:p-8">
      {children}
    </motion.div>
  );
}

export function Card({ title, subtitle, children, actions }: { title?: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-card border border-ink-100 bg-white p-4 sm:p-5">
      {(title || actions) && (
        <div className="flex items-start gap-3">
          <div className="flex-1">{title && <h3 className="font-bold">{title}</h3>}{subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}</div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function F({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  const id = useId();
  // connect the label/error to a single native field child (input/select/textarea)
  const field = isValidElement(children) && typeof children.type === "string" && ["input", "select", "textarea"].includes(children.type);
  const control = field
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? id + "-err" : undefined })
    : children;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-baseline justify-between gap-2"><label htmlFor={field ? id : undefined} className="text-sm font-medium text-ink-700">{label}</label>{hint && <span className="text-xs text-ink-500">{hint}</span>}</div>
      {control}
      {error && <p id={id + "-err"} role="alert" className="mt-1 text-xs font-semibold">{error}</p>}
    </div>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-4 py-1.5 text-left text-sm" role="switch" aria-checked={value}>
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-ink-500">{hint}</span>}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200", value ? "bg-brand" : "bg-ink-200")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200", value ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Lines({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <F label={label} hint="по одному на строку">
      <textarea className="textarea min-h-[100px]" value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={() => onChange(value.map((s) => s.trim()).filter(Boolean))} />
    </F>
  );
}
