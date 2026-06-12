import type { MetadataRoute } from "next";
import { absoluteUrl, ROBOTS_DISALLOW_PATHS } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
