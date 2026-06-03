import { SITE } from "@/lib/site";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
}

const LOGO_ASPECT = 1762.51 / 372.79;

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

  return (
    <svg
      viewBox="0 0 1762.51 372.79"
      role="img"
      aria-label={SITE.logoAlt}
      className={`site-logo block max-w-full ${config.className} ${className}`.trim()}
    >
      <use href={`${SITE.logo}#chuchoter-logo`} xlinkHref={`${SITE.logo}#chuchoter-logo`} />
    </svg>
  );
}
