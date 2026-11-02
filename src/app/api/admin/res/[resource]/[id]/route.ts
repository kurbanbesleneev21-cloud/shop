import { route, ok, body, ApiError } from "@/lib/api";
import { RESOURCES, delegate, revalidateResource } from "@/lib/admin-resources";
import { audit } from "@/lib/audit";

export const PUT = route<{ resource: string; id: string }>({ auth: "admin" }, async (req, { params, user, ip }) => {
  const r = RESOURCES[params.resource];
  if (!r) throw new ApiError(404, "Неизвестный ресурс");
  let data = (await body(req, r.schema)) as Record<string, unknown>;
  try {
    if (r.prepare) data = await r.prepare(data, params.id);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  const item = await delegate(r.model).update({ where: { id: params.id }, data });
  await audit(user, `${params.resource}.update`, params.resource, params.id, data, ip);
  revalidateResource(params.resource);
  return ok({ ok: true, item });
});

export const DELETE = route<{ resource: string; id: string }>({ auth: "admin" }, async (_req, { params, user, ip }) => {
  const r = RESOURCES[params.resource];
  if (!r) throw new ApiError(404, "Неизвестный ресурс");
  const block = r.canDelete ? await r.canDelete(params.id) : null;
  if (block) throw new ApiError(409, block);
  await delegate(r.model).delete({ where: { id: params.id } });
  await audit(user, `${params.resource}.delete`, params.resource, params.id, undefined, ip);
  revalidateResource(params.resource);
  return ok();
});
