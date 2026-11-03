import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sellersFinance } from "@/lib/finance";

export const POST = route({ auth: "seller" }, async (req, { user }) => {
  const sellerId = user!.seller?.id;
  if (!sellerId) throw new ApiError(403, "Нет магазина");
  const shop = await prisma.seller.findUnique({ where: { id: sellerId }, select: { bik: true, bankAccount: true, inn: true } });
  if (!shop?.bik || !shop.bankAccount || !shop.inn) throw new ApiError(400, "Заполните ИНН и банковские реквизиты в настройках магазина");
  const { amount } = await body(req, z.object({ amount: z.coerce.number().int().min(100, "Минимальная сумма вывода — 100 ₽") }));
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sellerId}))`;
    const fin = (await sellersFinance([sellerId]))[sellerId];
    if (!fin || amount > fin.balance) throw new ApiError(400, "Недостаточно средств для вывода");
    await tx.payout.create({ data: { sellerId, amount, status: "PENDING", note: "Запрос продавца" } });
  });
  return ok();
});
