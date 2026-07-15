import Link from "next/link";

interface ProfileNavLinkProps {
  href: string;
  label: string;
  active?: boolean;
  className?: string;
  tabIndex?: number;
  layout?: "inline" | "stacked" | "icon";
}

function getProfileInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "会";
  return trimmed.charAt(0);
}

export default function ProfileNavLink({
  href,
  label,
  active = false,
  className = "",
  tabIndex,
  layout = "inline",
}: ProfileNavLinkProps) {
  const isStacked = layout === "stacked";
  const isIconOnly = layout === "icon";
  const initial = getProfileInitial(label);

  if (isIconOnly) {
    return (
      <Link
        href={href}
        prefetch={false}
        className={`profile-nav-link profile-nav-link--icon-only ${
          active ? "profile-nav-link--active text-gold" : "text-cream-muted hover:text-gold"
        } ${className}`.trim()}
        aria-current={active ? "page" : undefined}
        aria-label={`ログイン中 — ${label} — プロフィール`}
        tabIndex={tabIndex}
      >
        <span className="profile-nav-link__avatar-wrap">
          <span className="profile-nav-link__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="profile-nav-link__status-dot" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={`profile-nav-link group transition-colors duration-300 ${
        isStacked
          ? "profile-nav-link--stacked block py-5 text-center"
          : "inline-flex items-center gap-2.5 px-3 py-1.5"
      } ${active ? "profile-nav-link--active text-gold" : "text-cream-muted hover:text-gold"} ${className}`.trim()}
      aria-current={active ? "page" : undefined}
      aria-label={`ログイン中 — ${label} — プロフィール`}
      tabIndex={tabIndex}
    >
      <span className="profile-nav-link__avatar-wrap">
        <span className="profile-nav-link__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="profile-nav-link__status-dot" aria-hidden="true" />
      </span>
      <span className={isStacked ? "mt-3 block" : "min-w-0 text-left"}>
        <span
          className={`block tracking-[0.12em] text-gold/80 ${
            isStacked ? "section-label mb-1" : "text-[10px]"
          }`}
        >
          ログイン中
        </span>
        <span
          className={`block truncate ${isStacked ? "text-xl font-serif-jp" : "max-w-[5.5rem] text-[13px]"}`}
        >
          {label}
        </span>
      </span>
    </Link>
  );
}
