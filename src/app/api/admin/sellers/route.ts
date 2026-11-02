import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { randomToken } from "@/lib/crypto";
import { emailSchema } from "@/lib/validation";

// Admin registers a seller: attaches to an existing account or creates a new one with a temporary password
export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({ email: emailSchema, name: z.string().trim().min(2).max(80), shopName: z.string().trim().min(2).max(100), inn: z.string().max(20).optional(), commissionRate: z.union([z.coerce.number().min(0).max(100), z.literal("")]).optional() }));
  let u = await prisma.user.findUnique({ where: { email: data.email }, include: { seller: true } });
  let tempPassword: string | undefined;
  if (u?.seller) throw new ApiError(409, "У этого пользователя уже есть магазин");
  if (!u) {
    tempPassword = randomToken(9);
    u = await prisma.user.create({ data: { email: data.email, name: data.name, passwordHash: await bcrypt.hash(tempPassword, 12), role: "SELLER" }, include: { seller: true } });
  } else if (u.role === "BUYER") await prisma.user.update({ where: { id: u.id }, data: { role: "SELLER" } });
  let slug = slugify(data.shopName);
  if (await prisma.seller.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36);
  const s = await prisma.seller.create({ data: { userId: u.id, shopName: data.shopName, slug, inn: data.inn, email: data.email, status: "APPROVED", commissionRate: data.commissionRate === "" || data.commissionRate === undefined ? null : data.commissionRate } });
  await audit(user, "seller.create", "seller", s.id, { email: data.email }, ip);
  return ok({ ok: true, tempPassword });
});
