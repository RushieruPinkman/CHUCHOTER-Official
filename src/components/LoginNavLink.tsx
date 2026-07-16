import Link from "next/link";
import UserIcon from "@/components/UserIcon";

interface LoginNavLinkProps {
  href: string;
  active?: boolean;
  className?: string;
  tabIndex?: number;
  layout?: "inline" | "stacked";
}

export default function LoginNavLink({
  href,
  active = false,
  className = "",
  tabIndex,
  layout = "inline",
}: LoginNavLinkProps) {
  const isStacked = layout === "stacked";

  return (
    <Link
      href={href}
      prefetch={false}
      className={`login-nav-link group transition-colors duration-300 ${
        isStacked ? "login-nav-link--stacked block py-5 text-center" : "inline-flex items-center gap-2.5 px-3 py-1.5"
      } ${active ? "login-nav-link--active text-gold" : "text-cream-muted hover:text-gold"} ${className}`.trim()}
      aria-current={active ? "page" : undefined}
      tabIndex={tabIndex}
    >
      <span className="login-nav-link__icon" aria-hidden="true">
        <UserIcon className={isStacked ? "h-5 w-5" : "h-4 w-4"} />
      </span>
      <span className={isStacked ? "mt-3 block" : "text-left"}>
        <span className={`block tracking-[0.28em] uppercase opacity-60 ${isStacked ? "section-label mb-1" : "text-[10px]"}`}>
          Sign In
        </span>
        <span className={`block ${isStacked ? "text-xl font-serif-jp" : "text-[13px]"}`}>ログイン</span>
      </span>
    </Link>
  );
}
