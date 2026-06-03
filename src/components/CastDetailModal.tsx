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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-modal-title"
      onClick={onClose}
    >
      <div
        className="panel max-h-[90vh] w-full max-w-4xl overflow-y-auto md:max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4 md:px-8 md:py-5">
          <span className="section-label mb-0">Resident</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="grid gap-8 p-5 md:grid-cols-[0.85fr_1.15fr] md:gap-10 md:p-8">
          <div className="overflow-hidden border border-[var(--color-border)] bg-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cast.image}
              alt={`${cast.name}のポートレート`}
              className="aspect-[3/4] w-full object-cover"
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
            <p className="whitespace-pre-line text-[15px] leading-[2] text-cream-muted">{cast.bio}</p>
            <div className="mt-8">
              <Button href="/system#request-invite">Request Invite</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
