"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GachaPrizeCard from "@/components/GachaPrizeCard";
import GachaSharePanel from "@/components/GachaSharePanel";
import type { GachaPrizeCastOption } from "@/components/GachaPrizeClaimModal";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { useGachaSerialStatusSync } from "@/hooks/useGachaSerialStatus";
import { getRarityLabel } from "@/lib/gacha";
import type { GachaDrawResult } from "@/lib/gacha";

interface GachaResultModalProps {
  result: GachaDrawResult;
  onClose: () => void;
  titleEn?: string;
  titleJa?: string;
  userKey?: string | null;
  prizeCasts?: GachaPrizeCastOption[];
}

export default function GachaResultModal({
  result,
  onClose,
  titleEn = "Prize",
  titleJa = "当選",
  userKey = null,
  prizeCasts = [],
}: GachaResultModalProps) {
  const syncedResult = useGachaSerialStatusSync(result, userKey) ?? result;
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prevFocus = document.activeElement as HTMLElement | null;

    lockBodyScroll();
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus();
    };
  }, [mounted, onClose]);

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
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="panel flex max-h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] w-full max-w-lg flex-col overflow-hidden md:max-w-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3 md:px-6">
          <div>
            <p className="section-label mb-0">{titleEn}</p>
            <h2 id={titleId} className="font-display text-lg text-gold md:text-xl">
              {titleJa}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:border-gold focus-visible:text-gold"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
          <p className="mb-4 text-center text-xs tracking-[0.12em] text-cream-faint">
            {getRarityLabel(syncedResult.rarity)} · {syncedResult.prize.title}
          </p>

          <div
            className={`gacha-result-modal__preview relative mx-auto mb-6 aspect-[4/5] w-full max-w-[280px] border border-[var(--color-border)] gacha-result-modal__preview--r${syncedResult.rarity}`}
          >
            <GachaPrizeCard
              prize={syncedResult.prize}
              rarity={syncedResult.rarity}
              cast={syncedResult.cast}
              showDetails
              wonAt={syncedResult.wonAt}
              serialNumber={syncedResult.serialNumber}
              serialStatus={syncedResult.serialStatus}
            />
          </div>

          <GachaSharePanel result={syncedResult} loginNextPath="/gacha" prizeCasts={prizeCasts} />
        </div>
      </div>
    </div>,
    document.body
  );
}
