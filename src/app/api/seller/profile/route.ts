import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { isAllowedImageUrl } from "@/lib/url-safety";

const schema = z.object({
  shopName: z.string().trim().min(2, "Название слишком короткое").max(100),
  description: z.string().trim().max(2000).optional().default(""),
  logo: z.string().trim().max(1000).optional().default("").refine((v) => !v || isAllowedImageUrl(v), "Загрузите логотип через кнопку"),
  legalName: z.string().trim().max(200).optional().default(""),
  inn: z.string().trim().regex(/^(\d{10}|\d{12})?$/, "ИНН — 10 или 12 цифр").optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().email("Некорректный email").max(160)]).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  bankName: z.string().trim().max(200).optional().default(""),
  bik: z.string().trim().regex(/^(\d{9})?$/, "БИК — 9 цифр").optional().default(""),
  bankAccount: z.string().trim().regex(/^(\d{20})?$/, "Расчётный счёт — 20 цифр").optional().default(""),
  returnPolicy: z.string().trim().max(2000).optional().default(""),
});

export const PATCH = route({ auth: "seller" }, async (req, { user, ip }) => {
  const sellerId = user!.seller?.id;
  if (!sellerId) throw new ApiError(403, "Нет магазина");
  const d = await body(req, schema);
  const nul = (v: string) => (v ? v : null);
  await prisma.seller.update({
    where: { id: sellerId },
    data: { shopName: d.shopName, description: nul(d.description), logo: nul(d.logo), legalName: nul(d.legalName), inn: nul(d.inn), phone: nul(d.phone), email: nul(d.email), address: nul(d.address), bankName: nul(d.bankName), bik: nul(d.bik), bankAccount: nul(d.bankAccount), returnPolicy: nul(d.returnPolicy) },
  });
  await audit(user, "seller.profile", "seller", sellerId, { shopName: d.shopName }, ip);
  return ok();
});
