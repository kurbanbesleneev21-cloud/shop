import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getGroup } from "@/lib/settings";
import { slugify } from "@/lib/utils";
import { notify, esc } from "@/lib/telegram";
import { audit } from "@/lib/audit";

export const POST = route({ auth: "user" }, async (req, { user, ip }) => {
  const cfg = await getGroup<{ allowRegistration: boolean; autoApprove: boolean }>("sellers");
  if (!cfg.allowRegistration) throw new ApiError(403, "Приём заявок продавцов временно закрыт");
  if (!user!.emailVerified && user!.role !== "ADMIN") throw new ApiError(403, "Сначала подтвердите email в личном кабинете — это обязательно для продавцов");
  const data = await body(req, z.object({ shopName: z.string().trim().min(2, "Укажите название магазина").max(100), legalName: z.string().trim().max(200).optional(), inn: z.string().trim().regex(/^(\d{10}|\d{12})?$/, "ИНН — 10 или 12 цифр").optional(), phone: z.string().trim().max(30).optional(), description: z.string().trim().max(2000).optional() }));
  const existing = await prisma.seller.findUnique({ where: { userId: user!.id } });
  if (existing && existing.status !== "REJECTED") throw new ApiError(409, "Заявка уже подана");
  let slug = slugify(data.shopName);
  const clash = await prisma.seller.findUnique({ where: { slug } });
  if (clash && clash.userId !== user!.id) slug += "-" + Date.now().toString(36);
  const status = cfg.autoApprove ? "APPROVED" : "PENDING";
  const s = existing
    ? await prisma.seller.update({ where: { id: existing.id }, data: { ...data, slug, status } })
    : await prisma.seller.create({ data: { ...data, slug, status, userId: user!.id, email: user!.email } });
  if (status === "APPROVED" && user!.role === "BUYER") await prisma.user.update({ where: { id: user!.id }, data: { role: "SELLER" } });
  await audit(user, "seller.apply", "seller", s.id, data, ip);
  notify("newSeller", `🏪 <b>Новый продавец</b>\n${esc(data.shopName)}${data.inn ? " · ИНН " + esc(data.inn) : ""}\n${esc(user!.name)} (${esc(user!.email)})\nСтатус: ${status === "APPROVED" ? "одобрен автоматически" : "ожидает модерации"}`);
  return ok({ ok: true, status });
});
