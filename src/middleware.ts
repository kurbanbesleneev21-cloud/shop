import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Per-request nonce: only scripts rendered by the server can run ('unsafe-inline' is ignored by CSP3 browsers when a nonce is present)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""} https: 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://images.unsplash.com https://mc.yandex.ru https://www.google-analytics.com",
    "connect-src 'self' https://*.public.blob.vercel-storage.com https://mc.yandex.ru https://*.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://app.platega.io https://pay.kaspi.kz",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://app.platega.io https://pay.kaspi.kz",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// Edge-level guard (defence in depth) + nonce-based CSP. Every page/route also re-checks permissions on the server.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (needAdmin) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (session?.role !== "ADMIN") {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Недостаточно прав" }, { status: session ? 403 : 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = `?auth=login&next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp); // Next.js reads the nonce from here and applies it to its own scripts
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  if (needAdmin) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|products/|favicon|robots.txt|sitemap.xml).*)", missing: [{ type: "header", key: "next-router-prefetch" }] }],
};
