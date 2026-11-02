import { route, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const DELETE = route<{ id: string }>({ auth: "admin" }, async (_req, { params }) => {
  await prisma.aiDraft.delete({ where: { id: params.id } });
  return ok();
});
