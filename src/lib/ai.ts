import "server-only";
import { getGroup, getSecret } from "./settings";

export type AiInput = { title: string; brand?: string; model?: string; specs?: string; wishes?: string; image?: string | null };
export type AiCategory = { slug: string; name: string; template: { key: string; label: string }[] };
export type AiOutput = {
  title: string; shortDescription: string; description: string; advantages: string[]; features: string[]; equipment: string[];
  specs: Record<string, string>; seoTitle: string; seoDescription: string; keywords: string[]; categorySlug: string; brand: string; model: string;
  needsReview: string[]; missingSpecs: string[];
};

const ENDPOINTS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

function prompt(input: AiInput, cats: AiCategory[]) {
  return `Ты — редактор карточек товаров маркетплейса электроники TECHMARKET. Пиши на русском языке, грамотно, без воды и без эмодзи.

СТРОГИЕ ПРАВИЛА:
1. НЕ выдумывай технические характеристики, цены, наличие, гарантию, комплектацию и любые числа. Используй ТОЛЬКО данные, которые дал администратор (поля ниже и фото).
2. Если какой-то характеристики нет во входных данных — НЕ заполняй её, а добавь её название в "missingSpecs".
3. Если в тексте описания есть утверждение, которое администратору нужно проверить, перечисли его кратко в "needsReview".
4. Комплектацию ("equipment") заполняй только если она указана во входных данных, иначе оставь пустой массив и добавь "Комплектация" в needsReview.
5. Описание должно быть полезным: для кого товар, сценарии использования, сильные стороны — опираясь только на известные данные.

ВХОДНЫЕ ДАННЫЕ:
Название: ${input.title}
Бренд: ${input.brand || "не указан"}
Модель: ${input.model || "не указана"}
Характеристики от администратора:
${input.specs?.trim() || "не указаны"}
Пожелания: ${input.wishes?.trim() || "нет"}
${input.image ? "Приложено фото товара — используй его только для описания внешнего вида и цвета." : ""}

КАТЕГОРИИ (выбери одну по slug) и ключи характеристик каждой категории:
${cats.map((c) => `- ${c.slug} (${c.name}): ${c.template.map((t) => `${t.key}=${t.label}`).join(", ")}`).join("\n")}

Ответь СТРОГО одним JSON-объектом без markdown:
{"title": "название товара для карточки (бренд + модель + ключевой параметр, если он известен)", "shortDescription": "1–2 предложения", "description": "полное описание, 3–5 абзацев через \\n\\n", "advantages": ["4–6 преимуществ"], "features": ["3–6 особенностей"], "equipment": [], "specs": {"ключ_характеристики_из_выбранной_категории": "значение только из входных данных"}, "seoTitle": "до 70 символов", "seoDescription": "до 160 символов", "keywords": ["8–12 поисковых фраз"], "categorySlug": "slug", "brand": "бренд", "model": "модель", "needsReview": ["что проверить"], "missingSpecs": ["названия характеристик категории, которых нет во входных данных"]}`;
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function aiConfigured() {
  return Boolean(await getSecret("ai", "apiKey"));
}

export async function generateCard(input: AiInput, cats: AiCategory[]): Promise<AiOutput> {
  const cfg = await getGroup<{ provider: string; model: string; baseUrl: string; temperature: number }>("ai");
  const key = await getSecret("ai", "apiKey");
  if (!key) throw new Error("API-ключ нейросети не задан. Укажите его в разделе «Глобальные настройки → AI».");
  const text = prompt(input, cats);
  const temperature = Math.max(0, Math.min(1, Number(cfg.temperature) / 100));
  let raw: string;
  if (cfg.provider === "gemini") {
    const parts: unknown[] = [{ text }];
    const m = input.image ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(input.image) : null;
    if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || "gemini-2.0-flash")}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(55000),
    });
    const j = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(j.error?.message || `Gemini HTTP ${res.status}`);
    raw = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  } else {
    const url = cfg.provider === "openai" ? `${(cfg.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions` : ENDPOINTS[cfg.provider];
    if (!url) throw new Error("Неизвестный AI-провайдер");
    const content: unknown = input.image && cfg.provider !== "groq" ? [{ type: "text", text }, { type: "image_url", image_url: { url: input.image } }] : text;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(cfg.provider === "openrouter" ? { "X-Title": "TECHMARKET" } : {}) },
      body: JSON.stringify({ model: cfg.model, temperature, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Ты отвечаешь только валидным JSON." }, { role: "user", content }] }),
      signal: AbortSignal.timeout(55000),
    });
    const j = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(j.error?.message || `HTTP ${res.status}`);
    raw = j.choices?.[0]?.message?.content ?? "";
  }
  let out: Partial<AiOutput>;
  try {
    out = parseJson(raw);
  } catch {
    throw new Error("Нейросеть вернула некорректный ответ. Попробуйте сгенерировать ещё раз.");
  }
  const cat = cats.find((c) => c.slug === out.categorySlug) ?? null;
  const allowedKeys = new Set(cat?.template.map((t) => t.key) ?? []);
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 20) : []);
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(out.specs ?? {})) if (allowedKeys.has(k) && String(v).trim() && !/не указ|unknown|—|n\/a/i.test(String(v))) specs[k] = String(v).trim().slice(0, 200);
  // Safety net: never auto-fill specs that are absent from the admin's input text
  const source = `${input.title} ${input.model ?? ""} ${input.specs ?? ""}`.toLowerCase();
  for (const [k, v] of Object.entries(specs)) {
    const digits = v.match(/\d+[.,]?\d*/g);
    if (digits && !digits.some((d) => source.includes(d.replace(",", ".")) || source.includes(d))) {
      delete specs[k];
      const label = cat?.template.find((t) => t.key === k)?.label ?? k;
      out.needsReview = [...(out.needsReview ?? []), `${label}: значение «${v}» не найдено во входных данных — проверьте`];
    }
  }
  const missing = cat ? cat.template.filter((t) => !specs[t.key]).map((t) => t.label) : arr(out.missingSpecs);
  return {
    title: String(out.title || input.title).slice(0, 200),
    shortDescription: String(out.shortDescription ?? "").slice(0, 600),
    description: String(out.description ?? "").slice(0, 8000),
    advantages: arr(out.advantages),
    features: arr(out.features),
    equipment: arr(out.equipment),
    specs,
    seoTitle: String(out.seoTitle ?? "").slice(0, 200),
    seoDescription: String(out.seoDescription ?? "").slice(0, 400),
    keywords: arr(out.keywords),
    categorySlug: cat?.slug ?? "",
    brand: String(out.brand || input.brand || ""),
    model: String(out.model || input.model || ""),
    needsReview: arr(out.needsReview),
    missingSpecs: missing,
  };
}
