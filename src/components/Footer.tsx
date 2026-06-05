import Link from "next/link";
import Logo from "@/components/Logo";
import VRChatIcon from "@/components/VRChatIcon";
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
      <p className="footer-heading mb-3 md:mb-4">{label}</p>
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-[var(--color-border)] bg-deep pb-[env(safe-area-inset-bottom,0px)]">
      <div className="site-container py-8 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] lg:gap-10">
          <div className="flex flex-col items-center border-b border-[var(--color-border)] pb-6 text-center lg:items-start lg:border-b-0 lg:pb-0 lg:text-left">
            <Link
              href="/"
              aria-label="CHUCHOTER トップページへ"
              className="inline-block opacity-90 transition-opacity hover:opacity-100"
            >
              <Logo size="sm" />
            </Link>
            <p
              className="mt-3 max-w-xs text-sm leading-relaxed text-cream-muted md:mt-4"
              style={{ fontFamily: "var(--font-serif-jp)" }}
            >
              {SITE.tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 sm:gap-6">
            <FooterColumn label="Site" className="col-span-2 sm:col-span-1">
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:block sm:space-y-2.5">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="footer-link">
                      {item.labelJa}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>

            <FooterColumn label="Hours">
              <ul className="space-y-2 text-sm text-cream-muted">
                <li className="leading-snug">火 · 水 · 木（不定期）</li>
                <li className="leading-snug">
                  1部 {SITE.part1Time}〜
                  <br />
                  2部 {SITE.part2Time}〜
                </li>
                <li>
                  <Link href="/schedule" className="footer-link">
                    予定表 →
                  </Link>
                </li>
              </ul>
            </FooterColumn>

            <FooterColumn label="Contact">
              <ul className="space-y-2.5">
                <li>
                  <a
                    href={SITE.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link group inline-flex min-h-10 items-center gap-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-faint transition-colors group-hover:border-gold/40 group-hover:text-gold">
                      <XIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 text-[12px] leading-snug break-all md:text-[13px]">
                      @CHUCHOTER_VRC
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={SITE.vrchatGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link group inline-flex min-h-10 items-center gap-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-faint transition-colors group-hover:border-gold/40 group-hover:text-gold">
                      <VRChatIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 text-[12px] leading-snug break-all md:text-[13px]">
                      VRChatグループ
                    </span>
                  </a>
                </li>
                <li className="space-y-2">
                  <Link href="/system#request-invite" className="footer-link block leading-snug">
                    Request Invite →
                  </Link>
                  <Link href="/media" className="footer-link block leading-snug">
                    キャスト・スタッフ募集 →
                  </Link>
                </li>
              </ul>
            </FooterColumn>
          </div>
        </div>

        <div className="hairline my-5 md:my-8" />

        <p className="text-center text-[10px] tracking-[0.12em] text-cream-faint sm:tracking-[0.16em] md:tracking-[0.2em]">
          © {new Date().getFullYear()} {SITE.name}{" "}
          <span className="uppercase">All rights reserved.</span>
        </p>
      </div>
    </footer>
  );
}
