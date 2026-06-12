import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/** インデックス対象の公開ページ（sitemap と整合） */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/system",
  "/casts",
  "/schedule",
  "/media",
  "/gacha",
  "/collection",
] as const;

/** robots.txt でクロール除外するパス */
export const ROBOTS_DISALLOW_PATHS = [
  "/admin",
  "/api/",
  "/auth/",
  "/login",
  "/login/reset-password",
  "/register",
  "/profile",
  "/dm",
  "/gacha/dev",
  "/login/dev",
  "/profile/dev",
] as const;

export function absoluteUrl(path: string): string {
  if (!path || path === "/") return SITE.url;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${normalized}`;
}

interface PageMetadataOptions {
  /** layout の title.template に渡す短いタイトル（TOP は default タイトルを使用） */
  title?: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  /** 省略時は SITE.ogImage（/opengraph-image） */
  ogImage?: string;
  ogImageAlt?: string;
}

/**
 * Google 検索セントラル推奨:
 * - ページごとに固有の title / description
 * - 正確で要約的な snippet（キーワードの羅列は避ける）
 * - canonical URL の明示
 * - インデックス不要ページは noindex
 */
export function buildPageMetadata({
  title,
  description,
  path,
  index = true,
  follow = true,
  ogImage,
  ogImageAlt,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const isHome = path === "/";
  const documentTitle = isHome
    ? `${SITE.name} | 高級隠れ家マンション`
    : `${title} | ${SITE.name}`;
  const imagePath = ogImage ?? SITE.ogImage;
  const imageUrl = imagePath.startsWith("http") ? imagePath : absoluteUrl(imagePath);
  const imageAlt = ogImageAlt ?? SITE.ogImageAlt;

  return {
    ...(isHome ? {} : { title }),
    description,
    alternates: { canonical },
    robots: index ? { index: true, follow } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url: canonical,
      siteName: SITE.name,
      title: documentTitle,
      description,
      images: [{ url: imageUrl, alt: imageAlt, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: documentTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    sameAs: [SITE.xUrl, SITE.vrchatGroupUrl],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "ja-JP",
    description: SITE.description,
  };
}
