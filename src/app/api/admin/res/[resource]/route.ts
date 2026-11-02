import { route, ok, body, ApiError } from "@/lib/api";
import { RESOURCES, delegate, revalidateResource } from "@/lib/admin-resources";
import { audit } from "@/lib/audit";

export const GET = route<{ resource: string }>({ auth: "admin" }, async (_req, { params }) => {
  const r = RESOURCES[params.resource];
  if (!r) throw new ApiError(404, "Неизвестный ресурс");
  return ok({ items: await delegate(r.model).findMany({ orderBy: r.order }) });
});

export const POST = route<{ resource: string }>({ auth: "admin" }, async (req, { params, user, ip }) => {
  const r = RESOURCES[params.resource];
  if (!r) throw new ApiError(404, "Неизвестный ресурс");
  let data = (await body(req, r.schema)) as Record<string, unknown>;
  try {
    if (r.prepare) data = await r.prepare(data);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  const item = await delegate(r.model).create({ data });
  await audit(user, `${params.resource}.create`, params.resource, item.id, data, ip);
  revalidateResource(params.resource);
  return ok({ ok: true, item });
});
