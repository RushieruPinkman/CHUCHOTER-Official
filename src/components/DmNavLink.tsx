"use client";

import Link from "next/link";
import { useDmUnreadSummary } from "@/hooks/useDmUnread";

interface DmNavLinkProps {
  href: string;
  label: string;
  labelJa: string;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
  tabIndex?: number;
}

export default function DmNavLink({
  href,
  label,
  labelJa,
  active = false,
  compact = false,
  onClick,
  tabIndex,
}: DmNavLinkProps) {
  const { unreadCount, ready } = useDmUnreadSummary();
  const showBadge = ready && unreadCount > 0;

  return (
    <Link
      href={href}
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
          <span className="dm-nav-badge" aria-label={`未読 ${unreadCount} 件`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
    </Link>
  );
}
