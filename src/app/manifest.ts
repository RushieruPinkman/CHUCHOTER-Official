import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} | 高級隠れ家マンション`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    lang: "ja",
    dir: "ltr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
