import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | 高級隠れ家クラブ`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "CLUB CHUCHOTER",
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
    title: `${SITE.name} | 高級隠れ家クラブ`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, alt: SITE.logoAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | 高級隠れ家クラブ`,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="relative min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-gold focus:bg-deep focus:px-4 focus:py-2 focus:text-gold"
        >
          メインコンテンツへスキップ
        </a>

        <div className="ambient-bg fixed inset-0 -z-20" aria-hidden="true" />

        <Header />
        <main id="main-content" className="relative z-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
