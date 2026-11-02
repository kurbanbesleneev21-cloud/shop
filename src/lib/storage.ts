import "server-only";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "./prisma";
import { randomToken } from "./crypto";

const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "heif"]);

/**
 * Validates an uploaded image by decoding it (not by trusting the MIME type),
 * strips metadata, resizes and re-encodes to WebP, then stores it in Vercel Blob
 * (cloud storage) — or in PostgreSQL when Blob is not configured.
 */
export async function saveImage(buf: Buffer, opts: { maxSide: number; ownerId?: string; folder?: string }) {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buf, { failOn: "error", limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new Error("Файл не является корректным изображением");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new Error("Допустимы только JPG, PNG, WebP и AVIF");
  const out = await sharp(buf, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: opts.maxSide, height: opts.maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const name = `${opts.folder ?? "uploads"}/${Date.now()}-${randomToken(8)}.webp`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, out.data, { access: "public", contentType: "image/webp", addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    await prisma.media.create({ data: { url: blob.url, mime: "image/webp", size: out.info.size, width: out.info.width, height: out.info.height, ownerId: opts.ownerId } });
    return { url: blob.url, width: out.info.width, height: out.info.height, size: out.info.size };
  }
  const m = await prisma.media.create({ data: { data: new Uint8Array(out.data), mime: "image/webp", size: out.info.size, width: out.info.width, height: out.info.height, ownerId: opts.ownerId } });
  const url = `/api/media/${m.id}`;
  await prisma.media.update({ where: { id: m.id }, data: { url } });
  return { url, width: out.info.width, height: out.info.height, size: out.info.size };
}
