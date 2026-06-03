import XIcon from "@/components/XIcon";

const SIZE_CLASS = {
  sm: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-11 w-11 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-5 [&_svg]:w-5",
} as const;

interface XLinkProps {
  href: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  label?: string;
}

export default function XLink({
  href,
  size = "md",
  className = "",
  label = "公式X",
}: XLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center justify-center border border-[var(--color-border)] text-cream-muted transition-[border-color,color,background-color] duration-200 hover:border-gold/40 hover:bg-gold/10 hover:text-gold ${SIZE_CLASS[size]} ${className}`.trim()}
    >
      <XIcon />
    </a>
  );
}
