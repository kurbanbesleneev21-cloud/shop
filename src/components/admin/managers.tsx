"use client";

import { CrudManager } from "./crud";
import { CategoryIcon } from "../shop/category-icon";
import { formatDate, formatPrice } from "@/lib/utils";

type Item = Record<string, unknown> & { id: string };

export function CategoriesManager({ items, parents }: { items: Item[]; parents: [string, string][] }) {
  return (
    <CrudManager
      resource="categories"
      items={items}
      sortable
      addLabel="Новая категория"
      defaults={{ name: "", slug: "", description: "", icon: "Package", image: "", parentId: "", sortOrder: items.length, active: true, showOnHome: true, specTemplate: [] }}
      title={(i) => String(i.name)}
      render={(i) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand"><CategoryIcon name={String(i.icon ?? "")} size={20} /></span>
          <div className="min-w-0">
            <div className="font-semibold">{i.parentName ? <span className="text-ink-400">{String(i.parentName)} → </span> : null}{String(i.name)}</div>
            <div className="text-xs text-ink-500">/{String(i.slug)} · {Number(i.productCount)} товаров · {(i.specTemplate as unknown[]).length} характеристик{i.active ? "" : " · скрыта"}{i.showOnHome ? " · на главной" : ""}</div>
          </div>
        </div>
      )}
      fields={[
        { name: "name", label: "Название", type: "text" },
        { name: "slug", label: "Адрес (slug)", type: "text", hint: "из названия, если пусто" },
        { name: "parentId", label: "Родительская категория", type: "select", options: [["", "— Корневая —"], ...parents] },
        { name: "sortOrder", label: "Порядок отображения", type: "number" },
        { name: "active", label: "Активна", type: "bool" },
        { name: "showOnHome", label: "Показывать на главной", type: "bool" },
        { name: "description", label: "Описание", type: "textarea" },
        { name: "icon", label: "Иконка", type: "icon" },
        { name: "image", label: "Фото категории", type: "image" },
        { name: "specTemplate", label: "Характеристики категории", type: "specTemplate" },
      ]}
    />
  );
}

export function BrandsManager({ items }: { items: Item[] }) {
  return (
    <CrudManager
      resource="brands"
      items={items}
      sortable
      addLabel="Новый бренд"
      defaults={{ name: "", slug: "", logo: "", description: "", popular: false, sortOrder: items.length }}
      title={(i) => String(i.name)}
      render={(i) => <div><div className="font-semibold">{String(i.name)} {i.popular ? <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand">популярный</span> : null}</div><div className="text-xs text-ink-500">{Number(i.productCount)} товаров</div></div>}
      fields={[
        { name: "name", label: "Название", type: "text" },
        { name: "slug", label: "Адрес (slug)", type: "text" },
        { name: "popular", label: "Показывать в «Популярных брендах»", type: "bool" },
        { name: "sortOrder", label: "Порядок", type: "number" },
        { name: "description", label: "Описание", type: "textarea" },
        { name: "logo", label: "Логотип", type: "image" },
      ]}
    />
  );
}

export function BannersManager({ items }: { items: Item[] }) {
  return (
    <CrudManager
      resource="banners"
      items={items}
      sortable
      addLabel="Новый баннер"
      defaults={{ title: "", subtitle: "", image: "", link: "/catalog", buttonText: "Перейти к покупкам", position: "HERO", sortOrder: items.length, active: true }}
      title={(i) => String(i.title)}
      render={(i) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-ink">{i.image ? <img src={String(i.image)} alt="" className="h-full w-full object-contain" /> : null}</span>
          <div className="min-w-0"><div className="line-clamp-1 font-semibold">{String(i.title)}</div><div className="text-xs text-ink-500">{i.position === "HERO" ? "Главный слайдер" : "Промо-блок"} · {String(i.link ?? "")}{i.active ? "" : " · выключен"}</div></div>
        </div>
      )}
      fields={[
        { name: "title", label: "Заголовок", type: "text", full: true },
        { name: "subtitle", label: "Подзаголовок", type: "textarea" },
        { name: "position", label: "Расположение", type: "select", options: [["HERO", "Главный слайдер"], ["PROMO", "Специальные предложения"]] },
        { name: "buttonText", label: "Текст кнопки", type: "text" },
        { name: "link", label: "Ссылка", type: "text", hint: "/catalog/... или https://" },
        { name: "sortOrder", label: "Порядок", type: "number" },
        { name: "active", label: "Показывать", type: "bool" },
        { name: "image", label: "Изображение", type: "image" },
      ]}
    />
  );
}

export function PagesManager({ items }: { items: Item[] }) {
  return (
    <CrudManager
      resource="pages"
      items={items}
      sortable
      addLabel="Новая страница"
      defaults={{ title: "", slug: "", content: "", published: true, showInFooter: true, sortOrder: items.length, seoTitle: "", seoDescription: "" }}
      title={(i) => String(i.title)}
      render={(i) => <div><a href={`/info/${i.slug}`} target="_blank" className="font-semibold hover:text-brand">{String(i.title)}</a><div className="text-xs text-ink-500">/info/{String(i.slug)}{i.published ? "" : " · не опубликована"}{i.showInFooter ? " · в футере" : ""}</div></div>}
      fields={[
        { name: "title", label: "Заголовок", type: "text" },
        { name: "slug", label: "Адрес (slug)", type: "text" },
        { name: "published", label: "Опубликована", type: "bool" },
        { name: "showInFooter", label: "Показывать в меню страниц", type: "bool" },
        { name: "content", label: "Содержимое", type: "content" },
        { name: "seoTitle", label: "SEO-заголовок", type: "text" },
        { name: "seoDescription", label: "SEO-описание", type: "text" },
        { name: "sortOrder", label: "Порядок", type: "number" },
      ]}
    />
  );
}

export function PromosManager({ items, products, categories }: { items: Item[]; products: [string, string][]; categories: [string, string][] }) {
  return (
    <CrudManager
      resource="promos"
      items={items}
      addLabel="Новый промокод"
      defaults={{ code: "", type: "PERCENT", value: 10, minOrder: 0, maxUses: "", startsAt: "", endsAt: "", productIds: [], categoryIds: [], active: true }}
      title={(i) => String(i.code)}
      render={(i) => {
        const expired = i.endsAt && new Date(String(i.endsAt)) < new Date();
        return (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-sm font-bold text-white">{String(i.code)}</span>
            <span className="font-semibold text-brand">−{i.type === "PERCENT" ? `${i.value}%` : formatPrice(Number(i.value))}</span>
            <span className="text-xs text-ink-500">
              от {formatPrice(Number(i.minOrder))} · использован {Number(i.usedCount)}{i.maxUses ? ` из ${i.maxUses}` : ""}
              {i.endsAt ? ` · до ${formatDate(String(i.endsAt))}` : ""}
              {(i.productIds as unknown[]).length ? ` · ${(i.productIds as unknown[]).length} товаров` : ""}
              {(i.categoryIds as unknown[]).length ? ` · ${(i.categoryIds as unknown[]).length} категорий` : ""}
              {!i.active ? " · выключен" : expired ? " · истёк" : ""}
            </span>
          </div>
        );
      }}
      fields={[
        { name: "code", label: "Код", type: "text" },
        { name: "type", label: "Тип скидки", type: "select", options: [["PERCENT", "Процент"], ["FIXED", "Фиксированная сумма, ₽"]] },
        { name: "value", label: "Размер скидки", type: "number" },
        { name: "minOrder", label: "Минимальная сумма заказа, ₽", type: "number" },
        { name: "maxUses", label: "Лимит применений", type: "number", hint: "пусто — без лимита" },
        { name: "active", label: "Активен", type: "bool" },
        { name: "startsAt", label: "Начало действия", type: "date" },
        { name: "endsAt", label: "Окончание действия", type: "date" },
        { name: "categoryIds", label: "Только для категорий", type: "multi", options: categories, hint: "пусто — все" },
        { name: "productIds", label: "Только для товаров", type: "multi", options: products, hint: "пусто — все" },
      ]}
    />
  );
}
