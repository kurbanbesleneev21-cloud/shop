import { z } from "zod";
import { route, ok, body } from "@/lib/api";
import { priceCart } from "@/lib/orders";

export const POST = route({}, async (req) => {
  const data = await body(req, z.object({ items: z.array(z.object({ productId: z.string(), qty: z.coerce.number().int().min(1).max(999) })).max(100), promoCode: z.string().max(40).optional(), deliveryMethod: z.string().max(20).optional() }));
  return ok(await priceCart(data.items, data.promoCode, data.deliveryMethod));
});
