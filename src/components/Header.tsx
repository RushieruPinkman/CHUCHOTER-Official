"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { isGachaNavItem, NAV_ITEMS } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const next = window.scrollY > 24;
      setScrolled((prev) => (prev === next ? prev : next));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      lockBodyScroll();
      // フォーカスを最初のナビリンクへ移動
      requestAnimationFrame(() => firstNavLinkRef.current?.focus());
    } else {
      unlockBodyScroll();
    }
  }, [menuOpen]);

  // Escape でメニューを閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // ページ遷移完了後にメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
                const isGacha = isGachaNavItem(item.href);
                return (
                  <span key={item.href} className={`flex items-center ${isGacha ? "nav-item--gacha" : ""}`}>
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
              ref={menuBtnRef}
              type="button"
              className="relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-[var(--color-border)] transition-colors hover:border-gold/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
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

      {/* モバイルメニューオーバーレイ */}
      <nav
        id="mobile-nav"
        className={`fixed inset-0 z-40 flex max-h-[100dvh] flex-col overflow-hidden bg-void transition-opacity duration-300 lg:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="モバイルナビゲーション"
        aria-hidden={!menuOpen}
        // メニュー内でTabが最後の要素を超えたらハンバーガーボタンへ戻す
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !menuOpen) return;
          const focusable = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>("a, button")
          ).filter((el) => !el.closest("[aria-hidden]"));
          const last = focusable[focusable.length - 1];
          const first = focusable[0];
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            menuBtnRef.current?.focus();
          }
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            menuBtnRef.current?.focus();
          }
        }}
      >
        <div className="flex flex-1 flex-col justify-center px-8 pt-20">
          <div className="mb-8 flex justify-center">
            <ThemeToggle />
          </div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = pathname === item.href;
              const isGacha = isGachaNavItem(item.href);
              return (
                <li key={item.href} className={isGacha ? "mobile-nav-item--gacha" : undefined}>
                  <Link
                    ref={index === 0 ? firstNavLinkRef : undefined}
                    href={item.href}
                    className={`block border-b border-[var(--color-border)] py-5 text-center transition-colors focus-visible:outline-none focus-visible:text-gold ${
                      isActive ? "text-gold" : "text-cream hover:text-gold"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    tabIndex={menuOpen ? 0 : -1}
                  >
                    <span className="section-label mb-1 block">{item.label}</span>
                    <span className="block text-xl font-serif-jp">{item.labelJa}</span>
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
