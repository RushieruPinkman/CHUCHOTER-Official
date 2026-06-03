"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in seconds */
  delay?: number;
  /** Play on mount (hero sections) instead of on scroll */
  immediate?: boolean;
}

function isInViewport(el: Element) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  immediate = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useLayoutEffect(() => {
    if (immediate) {
      setVisible(true);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (isInViewport(el)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -1% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const style =
    delay > 0 ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined;

  const classes = [
    immediate ? "reveal-hero" : "reveal",
    !immediate && visible && "is-visible",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} style={style}>
      {children}
    </div>
  );
}
