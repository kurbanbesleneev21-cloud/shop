import "server-only";

/** Image URLs we serve: own static files, uploaded media, Vercel Blob. Everything else is rejected. */
export function isAllowedImageUrl(url: string) {
  return (
    url.startsWith("/products/") ||
    url.startsWith("/api/media/") ||
    /^\/[a-z0-9._-]+\.(svg|png|webp|jpg|jpeg|avif|ico)$/i.test(url) ||
    /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>]+$/i.test(url) ||
    /^https:\/\/images\.unsplash\.com\/[^\s"'<>]+$/i.test(url)
  );
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?fc|\[?fd|metadata\.google)/i;

/** Outgoing requests to admin-configured URLs (webhooks, custom AI endpoints): HTTPS + public host only (SSRF guard). */
export function assertPublicHttpsUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Некорректный URL");
  }
  if (u.protocol !== "https:") throw new Error("Разрешены только HTTPS-адреса");
  if (PRIVATE_HOST.test(u.hostname) || /^\d+$/.test(u.hostname)) throw new Error("Адрес во внутренней сети запрещён");
  if (u.username || u.password) throw new Error("URL не должен содержать логин и пароль");
  return u;
}
