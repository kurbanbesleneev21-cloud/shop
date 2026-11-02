import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateCard } from "@/lib/ai";
import { dbLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const maxDuration = 60;

export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({ title: z.string().trim().min(2, "Введите название товара").max(200), brand: z.string().max(80).optional(), model: z.string().max(120).optional(), specs: z.string().max(5000).optional(), wishes: z.string().max(1000).optional(), image: z.string().max(3_000_000).optional().nullable() }));
  if (data.image && !/^data:image\/(jpeg|png|webp);base64,/.test(data.image)) throw new ApiError(400, "Некорректное изображение");
  if (!(await dbLimit("ai:" + user!.id, 60, 60 * 60_000))) throw new ApiError(429, "Слишком много генераций, попробуйте позже");
  const cats = await prisma.category.findMany({ where: { active: true }, select: { slug: true, name: true, specTemplate: true } });
  try {
    const out = await generateCard(data, cats.map((c) => ({ slug: c.slug, name: c.name, template: (Array.isArray(c.specTemplate) ? c.specTemplate : []) as { key: string; label: string }[] })));
    await audit(user, "ai.generate", "ai", null, { title: data.title }, ip);
    return ok({ ok: true, output: out });
  } catch (e) {
    throw new ApiError(502, (e as Error).message);
  }
});
