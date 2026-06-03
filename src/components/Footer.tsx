import Link from "next/link";
import Logo from "@/components/Logo";
import XIcon from "@/components/XIcon";
import { NAV_ITEMS, SITE } from "@/lib/site";

function FooterColumn({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-4 text-[10px] tracking-[0.32em] text-gold/80 uppercase">{label}</p>
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-[var(--color-border)] bg-deep/40">
      <div className="site-container py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] lg:gap-10">
          <div>
            <Link
              href="/"
              aria-label="CHUCHOTER トップページへ"
              className="inline-block opacity-90 transition-opacity hover:opacity-100"
            >
              <Logo size="sm" />
            </Link>
            <p
              className="mt-4 text-sm leading-relaxed text-cream-muted"
              style={{ fontFamily: "var(--font-serif-jp)" }}
            >
              {SITE.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            <FooterColumn label="Site">
              <ul className="space-y-2.5">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-cream-muted transition-colors hover:text-gold"
                    >
                      {item.labelJa}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>

            <FooterColumn label="Hours">
              <ul className="space-y-2.5 text-sm text-cream-muted">
                <li>火 · 水 · 木（不定期）</li>
                <li>
                  1部 {SITE.part1Time}〜
                  <br />
                  2部 {SITE.part2Time}〜
                </li>
                <li>
                  <Link href="/schedule" className="transition-colors hover:text-gold">
                    予定表を見る →
                  </Link>
                </li>
              </ul>
            </FooterColumn>

            <FooterColumn label="Contact">
              <ul className="space-y-3">
                <li>
                  <a
                    href={SITE.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 text-sm text-cream-muted transition-colors hover:text-gold"
                  >
                    <span className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] text-cream-faint transition-colors group-hover:border-gold/40 group-hover:text-gold">
                      <XIcon className="h-3.5 w-3.5" />
                    </span>
                    @CHUCHOTER_VRC
                  </a>
                </li>
                <li>
                  <Link
                    href="/system#request-invite"
                    className="text-sm text-cream-muted transition-colors hover:text-gold"
                  >
                    Request Invite →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/media"
                    className="text-sm text-cream-muted transition-colors hover:text-gold"
                  >
                    キャスト・スタッフ募集 →
                  </Link>
                </li>
              </ul>
            </FooterColumn>
          </div>
        </div>

        <div className="hairline my-6 md:my-8" />

        <div className="flex flex-col gap-2 text-[10px] tracking-[0.22em] text-cream-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CLUB CHUCHOTER</p>
          <p className="uppercase">All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
