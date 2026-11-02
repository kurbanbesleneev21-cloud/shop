import { z } from "zod";
import { route, ok, body } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ auth: "admin" }, async (req, { user, params, ip }) => {
  const { status } = await body(req, z.object({ status: z.enum(["PAID", "CANCELLED"]) }));
  await prisma.payout.update({ where: { id: params.id }, data: { status, paidAt: status === "PAID" ? new Date() : null } });
  await audit(user, "payout." + status.toLowerCase(), "payout", params.id, undefined, ip);
  return ok();
});
