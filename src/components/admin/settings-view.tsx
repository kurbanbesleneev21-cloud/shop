"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { SettingsGroupForm } from "./settings-form";
import { MaintenancePanel } from "./maintenance";
import { SETTINGS_GROUPS } from "@/lib/settings-schema";
import { cn } from "@/lib/utils";

export function SettingsView({ values, secrets }: { values: Record<string, Record<string, unknown>>; secrets: Record<string, Record<string, boolean>> }) {
  const [active, setActive] = useState(SETTINGS_GROUPS[0].key);
  const g = SETTINGS_GROUPS.find((x) => x.key === active)!;
  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:px-0">
        {SETTINGS_GROUPS.map((x) => (
          <button key={x.key} onClick={() => setActive(x.key)} className={cn("shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition", active === x.key ? "bg-brand text-white" : "bg-white hover:bg-ink-100 lg:bg-transparent")}>{x.title}</button>
        ))}
      </nav>
      <div className="rounded-card bg-white p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-bold">{g.title}</h2>
        {g.description && <p className="mb-4 text-sm text-ink-500">{g.description}</p>}
        <div className="mt-4"><SettingsGroupForm key={g.key} group={g} initial={values[g.key] ?? {}} secrets={secrets[g.key] ?? {}} /></div>
        {g.key === "backup" && (
          <div className="mt-6 rounded-xl bg-brand-50 p-4">
            <div className="font-semibold">Резервная копия данных</div>
            <p className="mt-1 text-sm text-ink-600">Скачайте полный JSON-архив: настройки (без секретов), каталог, продавцов, баннеры, страницы, промокоды, отзывы{values.backup?.includeUsers ? ", пользователей" : ""}{values.backup?.includeOrders ? " и заказы" : ""}.</p>
            <a href="/api/admin/backup" className="btn-primary mt-3"><Download size={16} />Скачать резервную копию</a>
          </div>
        )}
        {g.key === "backup" && <MaintenancePanel />}
      </div>
    </div>
  );
}
