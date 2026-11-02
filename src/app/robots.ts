import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getGroup } from "@/lib/settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getGroup<{ robotsIndex: boolean }>("seo");
  const h = await headers();
  const base = `https://${h.get("x-forwarded-host") || h.get("host")}`;
  return {
    rules: seo.robotsIndex ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/seller", "/cart", "/checkout"] } : { userAgent: "*", disallow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
