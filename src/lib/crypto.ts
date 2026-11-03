import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "crypto";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is not configured");
  return createHash("sha256").update("techmarket-secrets:" + secret).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv, { authTagLength: 16 });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(payload: string) {
  try {
    const [iv, tag, enc] = payload.split(".");
    const tagBuf = Buffer.from(tag, "base64");
    if (tagBuf.length !== 16) return "";
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"), { authTagLength: 16 });
    decipher.setAuthTag(tagBuf);
    return Buffer.concat([decipher.update(Buffer.from(enc, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function randomCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += randomInt(0, 10).toString();
  return s;
}
