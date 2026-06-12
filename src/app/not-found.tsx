import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="site-header-offset flex min-h-[70svh] flex-col items-center justify-center px-5 text-center">
      <Logo size="md" className="mb-10 opacity-60" />
      <span className="section-label mb-4">404</span>
      <h1 className="section-title mb-4">ページが見つかりません</h1>
      <p className="mb-10 max-w-sm text-sm leading-relaxed text-cream-muted">
        ご指定の部屋は存在しないか、移転した可能性があります。
      </p>
      <Link href="/" className="btn-primary">
        エントランスへ戻る
      </Link>
    </div>
  );
}
