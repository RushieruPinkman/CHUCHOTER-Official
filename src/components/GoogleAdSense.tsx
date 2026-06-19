"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

function getAdSenseClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT?.trim();
  if (!id || process.env.NODE_ENV !== "production") return null;
  return id;
}

/** AdSense 審査・自動広告用スクリプト（本番の公開ページのみ） */
export default function GoogleAdSense() {
  const pathname = usePathname();
  const clientId = getAdSenseClientId();

  if (!clientId || pathname.startsWith("/admin")) return null;

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
