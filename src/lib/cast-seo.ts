import type { Cast } from "@/types";
import { SITE } from "@/lib/site";
import { absoluteUrl, buildBreadcrumbJsonLd, SEO_HOME_BREADCRUMB_NAME } from "@/lib/seo";

export function buildCastDescription(cast: Cast): string {
  const description = `${cast.name}（${cast.nameEn}）— ${cast.tagline}。CHUCHOTER（シュシュテ）公式サイトの住人紹介。`;
  if (description.length <= 160) return description;
  return `${description.slice(0, 157)}...`;
}

export function buildCastProfilePageJsonLd(cast: Cast) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: cast.name,
      alternateName: cast.nameEn,
      description: cast.tagline,
      image: absoluteUrl(cast.image),
      url: absoluteUrl(`/casts/${cast.id}`),
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

export function buildCastBreadcrumbJsonLd(cast: Cast) {
  return buildBreadcrumbJsonLd([
    { name: SEO_HOME_BREADCRUMB_NAME, path: "/" },
    { name: "住人紹介", path: "/casts" },
    { name: cast.name, path: `/casts/${cast.id}` },
  ]);
}
