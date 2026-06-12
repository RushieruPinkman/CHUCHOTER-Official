import Image from "next/image";

type CastPortraitProps = {
  src: string;
  alt: string;
  variant?: "card" | "cover" | "natural";
  priority?: boolean;
  sizes?: string;
  className?: string;
};

const DEFAULT_CARD_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 280px";

const DEFAULT_COVER_SIZES =
  "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px";

export default function CastPortrait({
  src,
  alt,
  variant = "card",
  priority = false,
  sizes,
  className = "",
}: CastPortraitProps) {
  if (variant === "natural") {
    return (
      <Image
        src={src}
        alt={alt}
        width={900}
        height={1200}
        priority={priority}
        sizes={sizes ?? "(max-width: 768px) 100vw, 420px"}
        className={`block h-auto w-full ${className}`.trim()}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes ?? (variant === "cover" ? DEFAULT_COVER_SIZES : DEFAULT_CARD_SIZES)}
      className={`cast-card-media__image ${className}`.trim()}
    />
  );
}
