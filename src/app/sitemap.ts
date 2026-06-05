import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;
  const pages = ["", "/system", "/casts", "/gacha", "/schedule", "/media"];

  return pages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/schedule" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
