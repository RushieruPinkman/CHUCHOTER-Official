"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNav from "@/components/AuthNav";
import DmNavLink from "@/components/DmNavLink";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { isGachaNavItem, isDmNavItem, NAV_ITEMS } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header
        className={`header-bar fixed inset-x-0 top-0 z-[100] isolate pointer-events-auto transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled || menuOpen ? "header-glass" : "bg-transparent"
        }`}
      >
        <div className="site-container relative z-10">
          <div className="header-bar__mobile lg:hidden">
            <Link
              href="/"
              className="header-bar__logo focus-visible:outline-offset-4"
              aria-label="CHUCHOTER 公式サイト トップページへ"
            >
              <Logo size="sm" priority />
            </Link>

            <div className="header-bar__mobile-actions">
              <ThemeToggle />
              <AuthNav variant="mobile-header-icon" />
              <button
                type="button"
                className="header-bar__menu-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              >
                <span
                  className={`header-bar__menu-line ${menuOpen ? "header-bar__menu-line--top-open" : ""}`}
                />
                <span
                  className={`header-bar__menu-line ${menuOpen ? "header-bar__menu-line--mid-open" : ""}`}
                />
                <span
                  className={`header-bar__menu-line ${menuOpen ? "header-bar__menu-line--bot-open" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="header-bar__desktop hidden lg:block">
            <div className="header-bar__utilities">
              <ThemeToggle />
            </div>

            <div className="header-bar__stack">
              <Link
                href="/"
                className="header-bar__logo focus-visible:outline-offset-4"
                aria-label="CHUCHOTER 公式サイト トップページへ"
              >
                <Logo size="sm" priority />
              </Link>

              <nav className="header-bar__nav" aria-label="メインナビゲーション">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const isGacha = isGachaNavItem(item.href);
                  const isDm = isDmNavItem(item.href);

                  if (isDm) {
                    return (
                      <span key={item.href} className="inline-flex">
                        <DmNavLink
                          href={item.href}
                          label={item.label}
                          labelJa={item.labelJa}
                          active={isActive}
                        />
                      </span>
                    );
                  }

                  return (
                    <span
                      key={item.href}
                      className={isGacha ? "nav-item--gacha inline-flex" : "inline-flex"}
                    >
                      <Link
                        href={item.href}
                        className={`nav-link group px-2.5 py-1.5 text-center transition-colors duration-300 sm:px-3.5 sm:py-2 ${
                          isActive ? "text-gold" : "text-cream-muted hover:text-gold"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="block text-[9px] tracking-[0.22em] uppercase opacity-60 sm:text-[10px] sm:tracking-[0.28em]">
                          {item.label}
                        </span>
                        <span className="block text-[11px] sm:text-[13px]">{item.labelJa}</span>
                      </Link>
                    </span>
                  );
                })}
                <span className="inline-flex items-center">
                  <AuthNav />
                </span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <nav
        id="mobile-nav"
        className={`mobile-nav-panel lg:hidden ${menuOpen ? "mobile-nav-panel--open" : ""}`}
        aria-label="モバイルナビゲーション"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-nav-panel__inner">
          <ul className="mobile-nav-panel__grid">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const isGacha = isGachaNavItem(item.href);
              const isDm = isDmNavItem(item.href);

              return (
                <li
                  key={item.href}
                  className={
                    isGacha
                      ? "mobile-nav-item--gacha mobile-nav-panel__item"
                      : isDm
                        ? "mobile-nav-panel__item mobile-nav-item--dm"
                        : "mobile-nav-panel__item"
                  }
                >
                  {isDm ? (
                    <DmNavLink
                      href={item.href}
                      label={item.label}
                      labelJa={item.labelJa}
                      active={isActive}
                      compact
                      onClick={() => setMenuOpen(false)}
                      tabIndex={menuOpen ? 0 : -1}
                    />
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`mobile-nav-panel__link ${isActive ? "mobile-nav-panel__link--active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="mobile-nav-panel__label-en">{item.label}</span>
                      <span className="mobile-nav-panel__label-ja">{item.labelJa}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mobile-nav-panel__auth">
            <AuthNav variant="mobile" menuOpen={menuOpen} />
          </div>
        </div>
      </nav>
    </>
  );
}
