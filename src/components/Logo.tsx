import { SITE } from "@/lib/site";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
}

const LOGO_ASPECT = 643 / 166;

const SIZE_CONFIG = {
  sm: { height: 32, className: "h-8 w-auto md:h-9" },
  md: { height: 48, className: "h-11 w-auto md:h-12" },
  lg: { height: 120, className: "h-24 w-auto sm:h-28 md:h-32 lg:h-36 max-w-[min(88vw,620px)]" },
} as const;

export default function Logo({
  size = "md",
  priority = false,
  className = "",
}: LogoProps) {
  const config = SIZE_CONFIG[size];
  const width = Math.round(config.height * LOGO_ASPECT);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SITE.logo}
      alt={SITE.logoAlt}
      width={width}
      height={config.height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={`block ${config.className} ${className}`.trim()}
    />
  );
}
