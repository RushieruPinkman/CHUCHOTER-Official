"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import CastRoleBadge from "@/components/CastRoleBadge";
import type { Cast } from "@/types";

interface CastDetailModalProps {
  cast: Cast;
  onClose: () => void;
}

export default function CastDetailModal({ cast, onClose }: CastDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    lockBodyScroll();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-modal-title"
      onClick={onClose}
    >
      <div
        className="panel flex w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden max-md:h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] md:max-h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] md:max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span id="cast-modal-title" className="sr-only">
          {cast.nameEn} — {cast.name}
        </span>

        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5 md:px-8 md:py-5">
          <span className="section-label mb-0">Resident</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold md:h-9 md:w-9"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:overflow-y-auto md:overscroll-contain">
          {/* Mobile: one screen, no scroll */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cast.image}
                alt={`${cast.name}のポートレート`}
                className="h-full w-full object-cover object-top"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-void via-void/70 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <CastRoleBadge role={cast.role} className="mb-2" />
                <h2
                  className="text-lg leading-tight text-gold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {cast.nameEn}
                </h2>
                <p className="text-xs text-cream-muted">{cast.name}</p>
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3">
              <p
                className="text-xs leading-snug text-gold/90"
                style={{ fontFamily: "var(--font-serif-jp)" }}
              >
                {cast.tagline}
              </p>
              <div className="hairline my-2" />
              <p className="whitespace-pre-line text-[11px] leading-snug text-cream-muted">
                {cast.bio}
              </p>
            </div>
          </div>

          {/* Desktop: two-column layout */}
          <div className="hidden gap-10 p-8 md:grid md:grid-cols-[0.85fr_1.15fr]">
            <div className="border border-[var(--color-border)] bg-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cast.image}
                alt={`${cast.name}のポートレート`}
                className="block h-auto w-full"
              />
            </div>

            <div className="flex flex-col justify-center">
              <CastRoleBadge role={cast.role} className="mb-3" />
              <h2
                className="mb-1 text-3xl text-gold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {cast.nameEn}
              </h2>
              <p className="mb-4 text-lg text-cream-muted">{cast.name}</p>
              <p
                className="mb-6 text-lg text-gold/90"
                style={{ fontFamily: "var(--font-serif-jp)" }}
              >
                {cast.tagline}
              </p>
              <div className="hairline mb-6" />
              <p className="whitespace-pre-line pb-1 text-[15px] leading-[2] text-cream-muted">
                {cast.bio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
