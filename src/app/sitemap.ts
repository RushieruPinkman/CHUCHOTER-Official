import type { MetadataRoute } from "next";
import { getCasts } from "@/lib/data";
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const casts = await getCasts();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/schedule" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const castEntries: MetadataRoute.Sitemap = casts.map((cast) => ({
    url: absoluteUrl(`/casts/${cast.id}`),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...castEntries];
}
