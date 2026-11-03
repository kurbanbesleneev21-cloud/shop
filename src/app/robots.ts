import type { MetadataRoute } from "next";
import { getGroup } from "@/lib/settings";
import { SITE_URL } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getGroup<{ robotsIndex: boolean }>("seo");
  return {
    rules: seo.robotsIndex ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/seller", "/cart", "/checkout", "/pay", "/auth"] } : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
