import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminHeaderProps {
  trailing?: ReactNode;
}

export default function AdminHeader({ trailing }: AdminHeaderProps) {
  return (
    <header className="admin-header relative z-10 border-b border-[var(--color-border)] bg-surface/90">
      <div className="site-container flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/admin"
            className="shrink-0 focus-visible:outline-offset-4"
            aria-label="管理画面トップ"
          >
            <Logo size="sm" />
          </Link>
          <div className="min-w-0">
            <span className="section-label mb-0">Admin</span>
            <p className="truncate text-sm text-cream-muted">管理画面</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/" className="btn-ghost text-sm">
            サイトを見る
          </Link>
          <ThemeToggle />
          {trailing}
        </div>
      </div>
    </header>
  );
}
