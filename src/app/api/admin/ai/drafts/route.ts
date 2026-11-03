import { z } from "zod";
import { route, ok, body } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = route({ auth: "admin" }, async (req, { user }) => {
  const data = await body(req, z.object({ id: z.string().optional(), input: z.record(z.string(), z.unknown()), output: z.record(z.string(), z.unknown()), status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"), productId: z.string().optional() }));
  const { image: _img, ...input } = data.input as Record<string, unknown>;
  const payload = { input: input as object, output: data.output as object, status: data.status, productId: data.productId, createdBy: user!.id };
  const d = data.id ? await prisma.aiDraft.update({ where: { id: data.id }, data: payload }) : await prisma.aiDraft.create({ data: payload });
  return ok({ ok: true, id: d.id });
});
