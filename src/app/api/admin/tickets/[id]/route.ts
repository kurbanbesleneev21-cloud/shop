import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params }) => {
  const data = await body(req, z.object({ reply: z.string().trim().max(5000).optional(), status: z.enum(["OPEN", "ANSWERED", "CLOSED"]).optional() }));
  const t = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!t) throw new ApiError(404, "Обращение не найдено");
  await prisma.supportTicket.update({ where: { id: t.id }, data: { ...(data.reply ? { reply: data.reply, repliedAt: new Date(), status: data.status ?? "ANSWERED" } : {}), ...(data.status && !data.reply ? { status: data.status } : {}) } });
  if (data.reply) sendEmail(t.email, `Ответ на обращение: ${t.subject}`, "Ответ службы поддержки", `<p>${data.reply.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`).catch(() => undefined);
  await audit(user, "ticket.update", "ticket", t.id, data);
  return ok();
});
