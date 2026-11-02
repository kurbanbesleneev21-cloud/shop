import { z } from "zod";
import { cookies } from "next/headers";
import { route, ok, body, ApiError } from "@/lib/api";
import { DRAFTABLE, discardDrafts, getSettings, publishDrafts, saveGroup, saveSecrets, secretStatus } from "@/lib/settings";
import { SETTINGS_GROUPS, type HomeBlock } from "@/lib/settings-schema";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const GET = route({ auth: "admin" }, async () => ok({ values: await getSettings({ preview: false }), secrets: await secretStatus() }));

const homeBlock = z.object({
  id: z.string().max(40), type: z.enum(["hero", "categories", "products", "brands", "promo", "advantages"]), title: z.string().max(120), subtitle: z.string().max(200).optional(),
  enabled: z.boolean(), source: z.enum(["hits", "new", "discount", "featured", "category", "manual"]).optional(), category: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(24).optional(), productIds: z.array(z.string()).max(24).optional(),
});

export const PUT = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({ group: z.string().max(40), values: z.record(z.unknown()).default({}), secrets: z.record(z.union([z.string(), z.null()])).optional(), draft: z.boolean().optional() }));
  const known = SETTINGS_GROUPS.some((g) => g.key === data.group) || data.group === "home";
  if (!known) throw new ApiError(400, "Неизвестная группа настроек");
  const draft = Boolean(data.draft && DRAFTABLE.includes(data.group));
  let values = data.values;
  if (data.group === "home") values = { blocks: z.array(homeBlock).max(30).parse(values.blocks) as HomeBlock[] };
  const before = (await prisma.setting.findUnique({ where: { key: data.group } }))?.value as Record<string, unknown> | undefined;
  const saved = await saveGroup(data.group, values, { draft });
  const changedSecrets = data.secrets ? await saveSecrets(data.group, data.secrets) : [];
  const diff = Object.fromEntries(Object.entries(saved).filter(([k, v]) => JSON.stringify(before?.[k]) !== JSON.stringify(v)).map(([k, v]) => [k, { from: before?.[k] ?? null, to: v }]));
  await audit(user, draft ? "settings.draft" : "settings.update", "settings", data.group, { changes: diff, secretsChanged: changedSecrets }, ip);
  if (!draft) revalidatePath("/", "layout");
  return ok({ ok: true, values: saved, secrets: (await secretStatus())[data.group] ?? {} });
});

export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const { action } = await body(req, z.object({ action: z.enum(["publish", "discard", "preview-on", "preview-off"]) }));
  const c = await cookies();
  if (action === "publish") {
    const n = await publishDrafts();
    c.delete("tm_preview");
    revalidatePath("/", "layout");
    await audit(user, "settings.publish", "settings", null, { groups: n }, ip);
    return ok({ ok: true, published: n });
  }
  if (action === "discard") {
    await discardDrafts();
    c.delete("tm_preview");
    await audit(user, "settings.discard", "settings", null, undefined, ip);
    return ok();
  }
  if (action === "preview-on") c.set("tm_preview", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600, secure: process.env.NODE_ENV === "production" });
  else c.delete("tm_preview");
  return ok();
});
