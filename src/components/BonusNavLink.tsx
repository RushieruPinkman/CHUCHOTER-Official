"use client";

import Link from "next/link";
import { useBonusUnclaimedCount } from "@/hooks/useBonusUnclaimed";

interface BonusNavLinkProps {
  href: string;
  label: string;
  labelJa: string;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
  tabIndex?: number;
}

export default function BonusNavLink({
  href,
  label,
  labelJa,
  active = false,
  compact = false,
  onClick,
  tabIndex,
}: BonusNavLinkProps) {
  const { count, ready } = useBonusUnclaimedCount();
  const showBadge = ready && count > 0;

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      tabIndex={tabIndex}
      className={`nav-link group relative px-2.5 py-1.5 text-center transition-colors duration-300 sm:px-3.5 sm:py-2 ${
        active ? "text-gold" : "text-cream-muted hover:text-gold"
      } ${compact ? "mobile-nav-panel__link block" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="block text-[9px] tracking-[0.22em] uppercase opacity-60 sm:text-[10px] sm:tracking-[0.28em]">
        {label}
      </span>
      <span className="relative inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-[13px]">
        {labelJa}
        {showBadge && (
          <span className="nav-count-badge" aria-label={`未受取ボーナス ${count} 件`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    </Link>
  );
}
