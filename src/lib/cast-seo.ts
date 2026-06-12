import type { Cast } from "@/types";
import { SITE } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

export function buildCastDescription(cast: Cast): string {
  const description = `${cast.name}（${cast.nameEn}）— ${cast.tagline}。CHUCHOTER（シュシュテ）の住人紹介。`;
  if (description.length <= 160) return description;
  return `${description.slice(0, 157)}...`;
}

export function buildCastPersonJsonLd(cast: Cast) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: cast.name,
    alternateName: cast.nameEn,
    description: cast.tagline,
    image: absoluteUrl(cast.image),
    url: absoluteUrl(`/casts/${cast.id}`),
    memberOf: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

export function buildCastBreadcrumbJsonLd(cast: Cast) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "エントランス",
        item: SITE.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "住人紹介",
        item: absoluteUrl("/casts"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cast.name,
        item: absoluteUrl(`/casts/${cast.id}`),
      },
    ],
  };
}
