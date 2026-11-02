import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { priceCart } from "@/lib/orders";
import { memoryLimit } from "@/lib/rate-limit";

export const POST = route({}, async (req, { ip }) => {
  if (!memoryLimit("promo:" + ip, 30, 60_000)) throw new ApiError(429, "Слишком много попыток");
  const data = await body(req, z.object({ code: z.string().trim().min(2).max(40), items: z.array(z.object({ productId: z.string(), qty: z.coerce.number().int().min(1).max(999) })).max(100) }));
  const r = await priceCart(data.items, data.code);
  if (r.promoError) throw new ApiError(400, r.promoError);
  return ok({ ok: true, discount: r.discount, code: r.promo?.code });
});
