import type { Metadata } from "next";
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Google 検索セントラル準拠（https://developers.google.com/search/docs）
 *
 * 遵守事項:
 * - 構造化データはページ上に実際に表示されている内容と一致させる
 * - title / description は正確・要約的に（キーワード羅列・虚偽表示は禁止）
 * - canonical で正規 URL を明示する
 * - インデックス不要ページは noindex + robots.txt で除外
 * - sitemap の lastmod は不正確な日時を入れない
 */
const ORGANIZATION_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;

/** パンくず先頭（ナビ表示名と一致） */
export const SEO_HOME_BREADCRUMB_NAME = "エントランス";

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

/** sitemap の優先度（トップを最上位、予定表は下位にしてブランド検索での競合を抑える） */
export const SITEMAP_PAGE_CONFIG: Record<
  (typeof PUBLIC_SITEMAP_PATHS)[number],
  { priority: number; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]> }
> = {
  "/": { priority: 1, changeFrequency: "weekly" },
  "/system": { priority: 0.8, changeFrequency: "monthly" },
  "/casts": { priority: 0.75, changeFrequency: "weekly" },
  "/schedule": { priority: 0.5, changeFrequency: "weekly" },
  "/media": { priority: 0.6, changeFrequency: "monthly" },
  "/gacha": { priority: 0.6, changeFrequency: "weekly" },
  "/collection": { priority: 0.55, changeFrequency: "weekly" },
};

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
    ...(isHome
      ? {
          applicationName: SITE.name,
          authors: [{ name: SITE.name, url: SITE.url }],
        }
      : {}),
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
    "@id": ORGANIZATION_ID,
    name: SITE.name,
    alternateName: ["シュシュテ", "CHUCHOTER VRC"],
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    sameAs: [SITE.xUrl, SITE.vrchatGroupUrl],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    alternateName: ["シュシュテ"],
    url: SITE.url,
    inLanguage: "ja-JP",
    description: SITE.description,
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "WebPage",
      "@id": `${SITE.url}/#webpage`,
      url: SITE.url,
      name: `${SITE.name} | 高級隠れ家マンション`,
    },
  };
}

/** トップページ専用 — 公式サイトの代表ページであることを明示 */
export function buildHomePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE.url}/#webpage`,
    url: SITE.url,
    name: `${SITE.name} | 高級隠れ家マンション`,
    description: SITE.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    inLanguage: "ja-JP",
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** 公開サブページ共通 — トップを親にしたパンくず（表示見出しと一致させる） */
export function buildPublicPageBreadcrumb(pageName: string, path: string) {
  return buildBreadcrumbJsonLd([
    { name: SEO_HOME_BREADCRUMB_NAME, path: "/" },
    { name: pageName, path },
  ]);
}

export function buildFaqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildCastListJsonLd(casts: { id: string; name: string }[]) {
  if (casts.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE.name} 住人一覧`,
    itemListElement: casts.map((cast, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cast.name,
      url: absoluteUrl(`/casts/${cast.id}`),
    })),
  };
}
