/** Canonical public origin. Set NEXT_PUBLIC_SITE_URL when a custom domain is connected. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://techmarket-shop.vercel.app").replace(/\/+$/, "");
