import Image from "next/image";
import { SITE } from "@/lib/site";

export default function HeroBackgroundImage() {
  return (
    <div className="hero-mv__zoom">
      <Image
        src={SITE.heroImage}
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="hero-mv__image"
      />
    </div>
  );
}
