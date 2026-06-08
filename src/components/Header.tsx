"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNav from "@/components/AuthNav";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { isGachaNavItem, NAV_ITEMS } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
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

  return (
    <header
      className={`header-bar fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? "header-glass" : "bg-transparent"
      }`}
    >
      <div className="site-container relative z-10">
        <div className="header-bar__utilities">
          <ThemeToggle />
        </div>

        <div className="header-bar__stack">
          <Link
            href="/"
            className="header-bar__logo focus-visible:outline-offset-4"
            aria-label="CHUCHOTER トップページへ"
          >
            <Logo size="sm" priority />
          </Link>

          <nav className="header-bar__nav" aria-label="メインナビゲーション">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const isGacha = isGachaNavItem(item.href);

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
    </header>
  );
}
