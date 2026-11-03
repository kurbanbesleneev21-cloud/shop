import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  city: z.string().trim().min(2, "Укажите город").max(80),
  line: z.string().trim().min(3, "Укажите адрес").max(200),
  zip: z.string().trim().max(10).optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

export const GET = route({ auth: "user" }, async (_req, { user }) => {
  const items = await prisma.address.findMany({ where: { userId: user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], select: { id: true, city: true, line: true, zip: true, isDefault: true } });
  return ok({ items });
});

export const POST = route({ auth: "user", limit: 30 }, async (req, { user }) => {
  const d = await body(req, schema);
  const count = await prisma.address.count({ where: { userId: user!.id } });
  if (count >= 10) throw new ApiError(400, "Можно сохранить не больше 10 адресов");
  const makeDefault = d.isDefault || count === 0;
  if (makeDefault) await prisma.address.updateMany({ where: { userId: user!.id }, data: { isDefault: false } });
  const a = await prisma.address.create({ data: { userId: user!.id, city: d.city, line: d.line, zip: d.zip || null, isDefault: makeDefault } });
  return ok({ id: a.id });
});

export const PATCH = route({ auth: "user" }, async (req, { user }) => {
  const { id } = await body(req, z.object({ id: z.string().min(5).max(40) }));
  const a = await prisma.address.findFirst({ where: { id, userId: user!.id } });
  if (!a) throw new ApiError(404, "Адрес не найден");
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user!.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return ok();
});

export const DELETE = route({ auth: "user" }, async (req, { user }) => {
  const id = req.nextUrl.searchParams.get("id") || "";
  const a = await prisma.address.findFirst({ where: { id, userId: user!.id } });
  if (!a) throw new ApiError(404, "Адрес не найден");
  await prisma.address.delete({ where: { id } });
  if (a.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: user!.id }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return ok();
});
