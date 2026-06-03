"use client";

import { useEffect } from "react";
import Button from "@/components/Button";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import type { Cast } from "@/types";

interface CastDetailModalProps {
  cast: Cast;
  onClose: () => void;
}

export default function CastDetailModal({ cast, onClose }: CastDetailModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-6"
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
        className="panel flex w-full max-w-4xl flex-col overflow-hidden md:max-w-5xl"
        style={{ maxHeight: "min(calc(100dvh - 1.5rem), calc(100svh - 1.5rem))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--color-border)] px-5 py-4 md:px-8 md:py-5">
          <span className="section-label mb-0">Resident</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-6 p-5 md:grid-cols-[0.85fr_1.15fr] md:gap-10 md:p-8">
            <div className="overflow-hidden border border-[var(--color-border)] bg-deep md:max-h-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cast.image}
                alt={`${cast.name}のポートレート`}
                className="aspect-[3/4] max-h-[38vh] w-full object-cover md:max-h-none"
              />
            </div>

            <div className="flex flex-col justify-center">
              <h2
                id="cast-modal-title"
                className="mb-1 text-2xl text-gold md:text-3xl"
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
              <p className="whitespace-pre-line text-[15px] leading-[2] text-cream-muted">
                {cast.bio}
              </p>
              <div className="mt-8 pb-1">
                <Button href="/system#request-invite">Request Invite</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
