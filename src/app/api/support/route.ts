import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbLimit } from "@/lib/rate-limit";
import { emailSchema, nameSchema } from "@/lib/validation";
import { notify, esc } from "@/lib/telegram";

export const POST = route({}, async (req, { user, ip }) => {
  if (!(await dbLimit("support:" + (user?.id ?? ip), 10, 60 * 60_000))) throw new ApiError(429, "Слишком много обращений, попробуйте позже");
  const data = await body(req, z.object({ name: nameSchema, email: emailSchema, subject: z.string().trim().min(3, "Укажите тему").max(160), message: z.string().trim().min(10, "Опишите вопрос подробнее").max(5000), orderId: z.string().max(40).optional() }));
  const t = await prisma.supportTicket.create({ data: { ...data, userId: user?.id ?? null } });
  notify("newTicket", `💬 <b>Новое обращение</b>\n${esc(data.subject)}\nОт: ${esc(data.name)} (${esc(data.email)})\n${esc(data.message.slice(0, 500))}`);
  return ok({ ok: true, id: t.id });
});
