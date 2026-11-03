import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { decrypt, encrypt } from "./crypto";
import { SETTINGS_GROUPS, SECRET_FIELDS, defaultsFor, type HomeBlock, type SettingsValues } from "./settings-schema";

const ALL_GROUPS = [...SETTINGS_GROUPS.map((g) => g.key), "home"];
export const DRAFTABLE = ["design", "home", "general", "menu", "footer", "ads", "contacts", "social"];

const loadRaw = unstable_cache(
  async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  },
  ["settings-raw"],
  { tags: ["settings"], revalidate: 300 },
);

function merge(groupKey: string, stored: unknown) {
  const base = defaultsFor(groupKey);
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) base[k] = v;
  }
  return base;
}

/** Public, non-secret settings. Uses drafts when an admin enabled preview mode. */
export async function getSettings(opts: { preview?: boolean } = {}): Promise<SettingsValues> {
  const raw = await loadRaw().catch(() => ({} as Record<string, unknown>));
  let usePreview = opts.preview ?? false;
  if (opts.preview === undefined) {
    try {
      const c = await cookies();
      if (c.get("tm_preview")?.value === "1") {
        const { getCurrentUser } = await import("./session");
        usePreview = (await getCurrentUser())?.role === "ADMIN";
      }
    } catch {
      usePreview = false;
    }
  }
  const out: SettingsValues = {};
  for (const key of ALL_GROUPS) {
    const draft = usePreview && DRAFTABLE.includes(key) ? raw["draft:" + key] : undefined;
    out[key] = merge(key, draft ?? raw[key]);
  }
  return out;
}

export async function getGroup<T = Record<string, unknown>>(key: string): Promise<T> {
  const s = await getSettings({ preview: false });
  return s[key] as T;
}

export async function getHomeBlocks(preview?: boolean): Promise<HomeBlock[]> {
  const s = await getSettings({ preview });
  const blocks = s.home?.blocks;
  return Array.isArray(blocks) ? (blocks as HomeBlock[]) : [];
}

function coerce(groupKey: string, input: Record<string, unknown>) {
  const group = SETTINGS_GROUPS.find((g) => g.key === groupKey);
  const out: Record<string, unknown> = {};
  if (!group) return input; // home / custom groups are validated by callers
  for (const f of group.fields) {
    if (f.type === "secret" || !(f.key in input)) continue;
    const v = input[f.key];
    switch (f.type) {
      case "number": {
        let n = Number(v);
        if (!Number.isFinite(n)) n = Number(f.default);
        if (f.min !== undefined) n = Math.max(f.min, n);
        if (f.max !== undefined) n = Math.min(f.max, n);
        out[f.key] = n;
        break;
      }
      case "boolean":
        out[f.key] = v === true || v === "true" || v === "on";
        break;
      case "select":
        out[f.key] = f.options?.some((o) => o.value === v) ? v : f.default;
        break;
      case "color":
        out[f.key] = typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : f.default;
        break;
      case "links":
        out[f.key] = Array.isArray(v)
          ? v
              .filter((l) => l && typeof l === "object")
              .map((l) => ({ label: String((l as { label?: unknown }).label ?? "").slice(0, 80), href: safeHref(String((l as { href?: unknown }).href ?? "")) }))
              .filter((l) => l.label && l.href)
              .slice(0, 30)
          : f.default;
        break;
      case "image": {
        const s = String(v ?? "").trim();
        // Only own/uploaded images are accepted (blocks javascript:, data:, tracking pixels etc.)
        const ok = !s || s.startsWith("/products/") || s.startsWith("/api/media/") || /^\/[a-z0-9._-]+\.(svg|png|webp|jpg|jpeg|ico)$/i.test(s) || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(s);
        out[f.key] = ok ? s.slice(0, 500) : "";
        break;
      }
      case "text":
      case "textarea":
      default:
        out[f.key] = String(v ?? "").slice(0, f.type === "textarea" ? 5000 : 500);
    }
  }
  // extra known keys
  if (groupKey === "telegram" && input.events && typeof input.events === "object") {
    out.events = Object.fromEntries(Object.entries(input.events as Record<string, unknown>).map(([k, v]) => [k, Boolean(v)]));
  }
  return out;
}

export function safeHref(href: string) {
  const h = href.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return h.slice(0, 300);
  if (/^https?:\/\//i.test(h)) return h.slice(0, 300);
  if (/^(mailto|tel):/i.test(h)) return h.slice(0, 300);
  return "";
}

export async function saveGroup(groupKey: string, input: Record<string, unknown>, opts: { draft?: boolean } = {}) {
  if (!ALL_GROUPS.includes(groupKey)) throw new Error("Unknown settings group");
  const key = opts.draft ? "draft:" + groupKey : groupKey;
  const existing = await prisma.setting.findUnique({ where: { key } });
  const fallback = opts.draft ? (await prisma.setting.findUnique({ where: { key: groupKey } }))?.value : undefined;
  const prev = (existing?.value ?? fallback ?? {}) as Record<string, unknown>;
  const value = { ...prev, ...coerce(groupKey, input) };
  await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
  revalidateTag("settings");
  return value;
}

export async function publishDrafts() {
  const drafts = await prisma.setting.findMany({ where: { key: { startsWith: "draft:" } } });
  for (const d of drafts) {
    const key = d.key.slice("draft:".length);
    await prisma.setting.upsert({ where: { key }, create: { key, value: d.value as object }, update: { value: d.value as object } });
  }
  await prisma.setting.deleteMany({ where: { key: { startsWith: "draft:" } } });
  revalidateTag("settings");
  return drafts.length;
}

export async function discardDrafts() {
  await prisma.setting.deleteMany({ where: { key: { startsWith: "draft:" } } });
  revalidateTag("settings");
}

export async function hasDrafts() {
  return (await prisma.setting.count({ where: { key: { startsWith: "draft:" } } })) > 0;
}

// ---------- secrets (never sent to the client) ----------

async function loadSecrets(): Promise<Record<string, Record<string, string>>> {
  const row = await prisma.setting.findUnique({ where: { key: "secrets" } });
  return ((row?.value as Record<string, Record<string, string>>) ?? {}) || {};
}

export async function getSecret(group: string, field: string): Promise<string> {
  const all = await loadSecrets();
  const enc = all[group]?.[field];
  return enc ? decrypt(enc) : "";
}

export async function secretStatus(): Promise<Record<string, Record<string, boolean>>> {
  const all = await loadSecrets();
  const out: Record<string, Record<string, boolean>> = {};
  for (const [g, fields] of Object.entries(SECRET_FIELDS)) {
    out[g] = Object.fromEntries(fields.map((f) => [f, Boolean(all[g]?.[f])]));
  }
  return out;
}

export async function saveSecrets(group: string, values: Record<string, unknown>) {
  const allowed = SECRET_FIELDS[group] ?? [];
  const all = await loadSecrets();
  all[group] = all[group] ?? {};
  const changed: string[] = [];
  for (const f of allowed) {
    if (!(f in values)) continue;
    const v = values[f];
    if (v === null || v === "__clear__") {
      delete all[group][f];
      changed.push(f);
    } else if (typeof v === "string" && v.trim() !== "") {
      all[group][f] = encrypt(v.trim());
      changed.push(f);
    }
  }
  if (changed.length) {
    await prisma.setting.upsert({ where: { key: "secrets" }, create: { key: "secrets", value: all }, update: { value: all } });
  }
  return changed;
}

export function parseCategoryRates(text: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  String(text ?? "")
    .split(/\n|,/)
    .forEach((line) => {
      const [k, v] = line.split("=").map((s) => s.trim());
      const n = Number(v);
      if (k && Number.isFinite(n)) out[k] = n;
    });
  return out;
}
