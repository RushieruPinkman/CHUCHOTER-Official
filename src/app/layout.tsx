import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AmbientParticles from "@/components/AmbientParticles";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE } from "@/lib/site";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | 高級隠れ家マンション`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "CHUCHOTER",
    "VRChat",
    "Le Ciel Blanc",
    "黒糖アメ",
    "Request Invite",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} | 高級隠れ家マンション`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, alt: SITE.logoAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | 高級隠れ家マンション`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: { index: true, follow: true },
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
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative min-h-screen">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-gold focus:bg-deep focus:px-4 focus:py-2 focus:text-gold"
          >
            メインコンテンツへスキップ
          </a>

          <div className="ambient-bg fixed inset-0 -z-20" aria-hidden="true">
            <div className="ambient-bg__layer ambient-bg__layer--dark" />
            <div className="ambient-bg__layer ambient-bg__layer--light" />
            <div className="ambient-bg__glow">
              <div className="ambient-bg__glow-layer ambient-bg__glow-layer--dark" />
              <div className="ambient-bg__glow-layer ambient-bg__glow-layer--light" />
            </div>
            <div className="ambient-bg__grain" />
            <div className="ambient-bg__vignette" />
            <AmbientParticles />
          </div>

          <Header />
          <main id="main-content" className="relative z-10 w-full max-w-full overflow-x-clip">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
