import { route, ok, ApiError } from "@/lib/api";
import { dbLimit } from "@/lib/rate-limit";
import { getGroup } from "@/lib/settings";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = route({ auth: "user" }, async (req, { user }) => {
  const sec = await getGroup<{ maxUploadMb: number; imageMaxSide: number }>("security");
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const purpose = String(fd?.get("purpose") || "product");
  if (!(file instanceof File)) throw new ApiError(400, "Файл не передан");
  const privileged = user!.role === "ADMIN" || user!.seller?.status === "APPROVED";
  if (["product", "banner", "brand", "category", "design", "ai"].includes(purpose) && !privileged) throw new ApiError(403, "Недостаточно прав для загрузки");
  if (!(await dbLimit("upload:" + user!.id, privileged ? 300 : 30, 60 * 60_000))) throw new ApiError(429, "Слишком много загрузок, попробуйте позже");
  if (file.size > sec.maxUploadMb * 1024 * 1024) throw new ApiError(413, `Максимальный размер файла — ${sec.maxUploadMb} МБ`);
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const res = await saveImage(buf, { maxSide: purpose === "review" ? 1400 : sec.imageMaxSide, ownerId: user!.id, folder: purpose });
    return ok(res);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
});
