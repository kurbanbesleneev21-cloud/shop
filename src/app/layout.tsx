import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Providers } from "@/components/providers";
import { toPublicConfig } from "@/lib/public-config-server";
import { FONT_URL, RADIUS, hexToRgbTriplet } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const seo = s.seo as Record<string, string | boolean>;
  const g = s.general as Record<string, string>;
  return {
    title: { default: String(seo.defaultTitle), template: String(seo.titleTemplate || "%s") },
    description: String(seo.defaultDescription),
    keywords: String(seo.keywords),
    applicationName: g.siteName,
    robots: seo.robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
    icons: g.faviconUrl ? { icon: g.faviconUrl } : { icon: "/favicon.svg" },
    openGraph: { type: "website", siteName: g.siteName, title: String(seo.defaultTitle), description: String(seo.defaultDescription), images: seo.ogImage ? [String(seo.ogImage)] : undefined, locale: "ru_RU" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFFFFF" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, user, h] = await Promise.all([getSettings(), getCurrentUser(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const favorites = user ? (await prisma.favorite.findMany({ where: { userId: user.id }, select: { productId: true } })).map((f) => f.productId) : [];
  const d = s.design as Record<string, string | boolean>;
  const font = String(d.font || "Inter");
  const a = s.analytics as Record<string, string>;
  const style = {
    "--brand": hexToRgbTriplet(String(d.primaryColor), "37 99 235"),
    "--ink": hexToRgbTriplet(String(d.textColor), "17 17 17"),
    "--bg": hexToRgbTriplet(String(d.backgroundColor), "255 255 255"),
    "--radius": RADIUS[String(d.radius)] ?? "16px",
    "--font": font === "system" ? "system-ui" : `"${font}"`,
  } as React.CSSProperties;
  return (
    <html lang="ru" style={style} data-card={String(d.cardStyle || "border")} data-anim={d.animations === false ? "off" : "on"}>
      <head>
        {FONT_URL[font] && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={FONT_URL[font]} />
          </>
        )}
      </head>
      <body>
        <Providers config={toPublicConfig(s)} initialUser={user ? JSON.parse(JSON.stringify(user)) : null} initialFavorites={favorites}>
          {children}
        </Providers>
        {/^\d{4,12}$/.test(a.yandexMetrikaId || "") && (
          <Script id="ym" strategy="afterInteractive" nonce={nonce}>{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${a.yandexMetrikaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}</Script>
        )}
        {/^G-[A-Z0-9]{4,15}$/.test(a.googleAnalyticsId || "") && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${a.googleAnalyticsId}`} strategy="afterInteractive" nonce={nonce} />
            <Script id="ga" strategy="afterInteractive" nonce={nonce}>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${a.googleAnalyticsId}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
