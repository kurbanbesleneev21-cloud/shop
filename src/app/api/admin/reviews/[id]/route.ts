import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recalcRating } from "@/lib/reviews";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const data = await body(req, z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), reply: z.string().trim().max(3000).optional().nullable(), clearComplaints: z.boolean().optional() }));
  const r = await prisma.review.findUnique({ where: { id: params.id } });
  if (!r) throw new ApiError(404, "Отзыв не найден");
  await prisma.review.update({
    where: { id: r.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.reply !== undefined ? { reply: data.reply || null, replyAt: data.reply ? new Date() : null } : {}),
      ...(data.clearComplaints ? { complaints: 0, complaintReasons: [] } : {}),
    },
  });
  await recalcRating(r.productId);
  await audit(user, "review.moderate", "review", r.id, data, ip);
  return ok();
});

export const DELETE = route<{ id: string }>({ auth: "admin" }, async (_req, { user, params, ip }) => {
  const r = await prisma.review.findUnique({ where: { id: params.id } });
  if (!r) throw new ApiError(404, "Отзыв не найден");
  await prisma.review.delete({ where: { id: r.id } });
  await recalcRating(r.productId);
  await audit(user, "review.delete", "review", r.id, { text: r.text.slice(0, 200) }, ip);
  return ok();
});
