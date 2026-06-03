"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { NAV_ITEMS } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [menuOpen]);

  return (
    <>
      <header
        className={`header-bar fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled ? "header-glass" : "bg-transparent"
        }`}
      >
        <div className="site-container relative z-10 flex h-[72px] items-center justify-between gap-3 md:h-20">
          <Link
            href="/"
            className="relative z-10 shrink-0 focus-visible:outline-offset-4"
            aria-label="CHUCHOTER トップページへ"
          >
            <Logo size="sm" priority />
          </Link>

          <div className="flex items-center gap-2 lg:gap-3">
            <nav
              className="hidden items-center gap-0 lg:flex"
              aria-label="メインナビゲーション"
            >
              {NAV_ITEMS.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <span key={item.href} className="flex items-center">
                    {index > 0 && (
                      <span
                        className="mx-1 h-3 w-px bg-[var(--color-border)]"
                        aria-hidden="true"
                      />
                    )}
                    <Link
                      href={item.href}
                      className={`nav-link group px-4 py-2 text-center transition-colors duration-300 ${
                        isActive ? "text-gold" : "text-cream-muted hover:text-gold"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="block text-[10px] tracking-[0.28em] uppercase opacity-60">
                        {item.label}
                      </span>
                      <span className="block text-[13px]">{item.labelJa}</span>
                    </Link>
                  </span>
                );
              })}
            </nav>

            <ThemeToggle className="relative z-10 shrink-0" />

            <button
              type="button"
              className="relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-[var(--color-border)] lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            >
              <span
                className={`block h-px w-4 bg-gold transition-all duration-300 ${menuOpen ? "translate-y-[6px] rotate-45" : ""}`}
              />
              <span
                className={`block h-px w-4 bg-gold transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-px w-4 bg-gold transition-all duration-300 ${menuOpen ? "-translate-y-[6px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <nav
        id="mobile-nav"
        className={`fixed inset-0 z-40 flex flex-col bg-void transition-opacity duration-300 lg:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="モバイルナビゲーション"
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-1 flex-col justify-center px-8 pt-20">
          <div className="mb-8 flex justify-center">
            <ThemeToggle />
          </div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block border-b border-[var(--color-border)] py-5 text-center transition-colors ${
                      isActive ? "text-gold" : "text-cream hover:text-gold"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="section-label mb-1 block">{item.label}</span>
                    <span className="block text-xl" style={{ fontFamily: "var(--font-serif-jp)" }}>
                      {item.labelJa}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
