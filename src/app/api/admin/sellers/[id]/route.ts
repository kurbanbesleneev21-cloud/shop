import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { h, sendEmail } from "@/lib/email";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const data = await body(req, z.object({
    action: z.enum(["approve", "reject", "block", "unblock", "update"]),
    shopName: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    legalName: z.string().trim().max(200).optional().nullable(),
    inn: z.string().trim().max(20).optional().nullable(),
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().max(160).optional().nullable(),
    commissionRate: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.null()]).optional(),
  }));
  const s = await prisma.seller.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!s) throw new ApiError(404, "Продавец не найден");
  if (data.action === "update") {
    const { action: _a, commissionRate, ...rest } = data;
    await prisma.seller.update({ where: { id: s.id }, data: { ...rest, commissionRate: commissionRate === "" || commissionRate === undefined ? (commissionRate === "" ? null : undefined) : commissionRate } });
  } else {
    const status = { approve: "APPROVED", reject: "REJECTED", block: "BLOCKED", unblock: "APPROVED" }[data.action] as "APPROVED" | "REJECTED" | "BLOCKED";
    await prisma.$transaction([
      prisma.seller.update({ where: { id: s.id }, data: { status } }),
      prisma.user.update({ where: { id: s.userId }, data: { role: status === "APPROVED" ? (s.user.role === "ADMIN" ? "ADMIN" : "SELLER") : s.user.role === "ADMIN" ? "ADMIN" : "BUYER" } }),
      ...(status === "BLOCKED" ? [prisma.product.updateMany({ where: { sellerId: s.id, status: "PUBLISHED" }, data: { status: "HIDDEN" } })] : []),
    ]);
    if (data.action === "approve") sendEmail(s.user.email, "Заявка продавца одобрена", "Добро пожаловать на маркетплейс!", `<p>Магазин «${h(s.shopName)}» подключён. Кабинет продавца уже доступен.</p>`).catch(() => undefined);
  }
  await audit(user, `seller.${data.action}`, "seller", s.id, data, ip);
  return ok();
});
