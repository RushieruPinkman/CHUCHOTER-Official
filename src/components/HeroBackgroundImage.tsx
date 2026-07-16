import Image from "next/image";
import { SITE } from "@/lib/site";
import { shouldBypassVercelImageOptimizer } from "@/lib/media-cdn";

export default function HeroBackgroundImage() {
  return (
    <div className="hero-mv__zoom">
      <Image
        src={SITE.heroImage}
        alt=""
        fill
        priority
        fetchPriority="high"
        unoptimized={shouldBypassVercelImageOptimizer(SITE.heroImage)}
        sizes="100vw"
        className="hero-mv__image"
      />
    </div>
  );
}
