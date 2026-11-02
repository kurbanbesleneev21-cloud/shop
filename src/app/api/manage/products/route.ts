import { route, ok, body } from "@/lib/api";
import { productSchema } from "@/lib/validation";
import { saveProduct } from "@/lib/product-service";

// Shared endpoint for admins and approved sellers; permissions are enforced in saveProduct()
export const POST = route({ auth: "seller" }, async (req, { user, ip }) => {
  const data = await body(req, productSchema);
  const r = await saveProduct(data, user!, undefined, ip);
  return ok({ ok: true, id: r.product.id, slug: r.product.slug, status: r.product.status, moderated: r.moderated });
});
