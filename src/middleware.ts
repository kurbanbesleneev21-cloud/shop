import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

// Edge-level guard (defence in depth). Every page/route also re-checks permissions on the server with a DB lookup.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const needAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (needAdmin && session?.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Недостаточно прав" }, { status: session ? 403 : 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = `?auth=login&next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  if (needAdmin) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
