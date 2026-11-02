import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbLimit } from "@/lib/rate-limit";

export const POST = route<{ id: string }>({ auth: "user" }, async (req, { user, params }) => {
  const { reason } = await body(req, z.object({ reason: z.string().trim().min(3, "Укажите причину").max(500) }));
  if (!(await dbLimit("complaint:" + user!.id, 20, 24 * 3600_000))) throw new ApiError(429, "Слишком много жалоб");
  const r = await prisma.review.findUnique({ where: { id: params.id }, select: { complaintReasons: true } });
  if (!r) throw new ApiError(404, "Отзыв не найден");
  const reasons = Array.isArray(r.complaintReasons) ? r.complaintReasons : [];
  await prisma.review.update({ where: { id: params.id }, data: { complaints: { increment: 1 }, complaintReasons: [...reasons, { userId: user!.id, reason, at: new Date().toISOString() }].slice(-50) } });
  return ok();
});
