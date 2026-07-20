import type { Metadata } from "next";
import GoogleAdSense from "@/components/GoogleAdSense";
import GoogleTagManager from "@/components/GoogleTagManager";
import SiteShell from "@/components/SiteShell";
import StructuredData from "@/components/StructuredData";
import { ThemeProvider } from "@/components/ThemeProvider";
import { shouldRenderPrivatePage } from "@/lib/site-private";
import { SITE } from "@/lib/site";
import "./globals.css";

/** 管理画面保存時は revalidateTag / revalidatePath で即時反映 */
export const revalidate = 86400;

const sitePrivatePage = shouldRenderPrivatePage();

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: sitePrivatePage ? `${SITE.name} — 非公開` : `${SITE.name} | 高級隠れ家マンション`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  robots: sitePrivatePage
    ? { index: false, follow: false }
    : { index: true, follow: true },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE.name,
    images: [{ url: SITE.ogImage, alt: SITE.ogImageAlt, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [SITE.ogImage],
  },
  icons: {
    icon: [{ url: SITE.favicon, type: "image/svg+xml" }],
    apple: [{ url: SITE.appleIcon, type: "image/svg+xml" }],
    shortcut: SITE.favicon,
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("chuchoter-theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (sitePrivatePage) {
    return (
      <html lang="ja">
        <head>
          <meta name="robots" content="noindex,nofollow" />
        </head>
        <body
          style={{
            margin: 0,
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(120, 80, 40, 0.35), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(40, 30, 20, 0.8), transparent 45%), #0c0a08",
            color: "#f3e8d8",
          }}
        >
          <main style={{ textAlign: "center", padding: "2rem" }}>
            <h1
              style={{
                fontWeight: 500,
                letterSpacing: "0.28em",
                fontSize: "1.35rem",
                margin: "0 0 1rem",
              }}
            >
              CHUCHOTER
            </h1>
            <p style={{ margin: 0, opacity: 0.72, fontSize: "0.95rem", letterSpacing: "0.06em" }}>
              現在サイトは非公開です。
            </p>
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <StructuredData />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative flex min-h-[100dvh] flex-col">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-gold focus:bg-deep focus:px-4 focus:py-2 focus:text-gold"
          >
            メインコンテンツへスキップ
          </a>

          <div className="ambient-bg" aria-hidden="true">
            <div className="ambient-bg__layer ambient-bg__layer--dark" />
            <div className="ambient-bg__layer ambient-bg__layer--light" />
            <div className="ambient-bg__glow">
              <div className="ambient-bg__glow-layer ambient-bg__glow-layer--dark" />
              <div className="ambient-bg__glow-layer ambient-bg__glow-layer--light" />
            </div>
            <div className="ambient-bg__vignette" />
          </div>

          <SiteShell>{children}</SiteShell>
        </ThemeProvider>
        <GoogleTagManager />
        <GoogleAdSense />
      </body>
    </html>
  );
}
