import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sellersFinance } from "@/lib/finance";

export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({ sellerId: z.string(), amount: z.coerce.number().int().min(1, "Сумма должна быть больше 0"), note: z.string().max(300).optional(), paid: z.boolean().default(true) }));
  const fin = (await sellersFinance([data.sellerId]))[data.sellerId];
  if (!fin) throw new ApiError(404, "Продавец не найден");
  if (data.amount > fin.balance) throw new ApiError(400, `Сумма превышает доступный баланс (${fin.balance} ₽)`);
  const p = await prisma.payout.create({ data: { sellerId: data.sellerId, amount: data.amount, note: data.note, status: data.paid ? "PAID" : "PENDING", paidAt: data.paid ? new Date() : null } });
  await audit(user, "payout.create", "payout", p.id, data, ip);
  return ok({ ok: true });
});
