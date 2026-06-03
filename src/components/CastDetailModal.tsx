"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import CastRoleBadge from "@/components/CastRoleBadge";
import CastVoicePlayer from "@/components/CastVoicePlayer";
import type { Cast } from "@/types";

interface CastDetailModalProps {
  cast: Cast;
  onClose: () => void;
}

export default function CastDetailModal({ cast, onClose }: CastDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prevFocus = document.activeElement as HTMLElement | null;

    lockBodyScroll();
    // 閉じるボタンに初期フォーカス
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // フォーカストラップ
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
      aria-labelledby="cast-modal-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="panel flex w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden max-md:h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] md:max-h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] md:max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダーバー */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5 md:px-8 md:py-5">
          <span className="section-label mb-0">Resident</span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:border-gold focus-visible:text-gold md:h-9 md:w-9"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:overflow-y-auto md:overscroll-contain">
          {/* スマホ: 画像 + スクロール可能なテキスト */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            {/* 画像エリア: flex-[0_0_55%] で固定割合、残りをテキストに */}
            <div className="relative shrink-0 overflow-hidden bg-deep" style={{ flex: "0 0 55%" }}>
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
                  id="cast-modal-title"
                  className="font-display text-lg leading-tight text-gold"
                >
                  {cast.nameEn}
                </h2>
                <p className="text-xs text-cream-muted">{cast.name}</p>
              </div>
            </div>

            {/* テキストエリア: スクロール可能 */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--color-border)] px-4 py-3">
              <p className="font-serif-jp text-xs leading-relaxed text-gold/90">{cast.tagline}</p>
              {cast.voiceUrl ? (
                <CastVoicePlayer src={cast.voiceUrl} className="my-3" />
              ) : null}
              <div className="hairline my-2" />
              <p className="whitespace-pre-line text-xs leading-relaxed text-cream-muted">
                {cast.bio}
              </p>
            </div>
          </div>

          {/* PC: 2カラム */}
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
                aria-hidden="true"
                className="font-display mb-1 text-3xl text-gold"
              >
                {cast.nameEn}
              </h2>
              <p className="mb-4 text-lg text-cream-muted">{cast.name}</p>
              <p className="font-serif-jp mb-4 text-lg text-gold/90">{cast.tagline}</p>
              {cast.voiceUrl ? (
                <CastVoicePlayer src={cast.voiceUrl} className="mb-6" />
              ) : null}
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
