import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { nameSchema, phoneSchema } from "@/lib/validation";

export const PATCH = route({ auth: "user" }, async (req, { user }) => {
  const data = await body(req, z.object({ name: nameSchema, phone: z.string().optional().default("") }));
  let phone: string | null = null;
  if (data.phone) {
    const p = phoneSchema.safeParse(data.phone);
    if (!p.success) throw new ApiError(400, "Введите корректный номер телефона");
    phone = p.data;
  }
  await prisma.user.update({ where: { id: user!.id }, data: { name: data.name, phone, ...(phone !== user!.phone ? { phoneVerified: null } : {}) } });
  return ok();
});
