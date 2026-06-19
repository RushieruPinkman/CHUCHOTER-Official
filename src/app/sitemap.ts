import type { MetadataRoute } from "next";
import { getCasts } from "@/lib/data";
import { absoluteUrl, PUBLIC_SITEMAP_PATHS, SITEMAP_PAGE_CONFIG } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const casts = await getCasts();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITEMAP_PATHS.map((path) => {
    const config = SITEMAP_PAGE_CONFIG[path];
    return {
      url: absoluteUrl(path),
      changeFrequency: config.changeFrequency,
      priority: config.priority,
    };
  });

  const castEntries: MetadataRoute.Sitemap = casts.map((cast) => ({
    url: absoluteUrl(`/casts/${cast.id}`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...castEntries];
}
