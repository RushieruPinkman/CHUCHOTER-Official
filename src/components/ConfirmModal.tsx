"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

interface ConfirmModalProps {
  open: boolean;
  titleEn?: string;
  titleJa: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  titleEn = "Confirm",
  titleJa,
  message,
  confirmLabel = "削除する",
  cancelLabel = "キャンセル",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;

    const prevFocus = document.activeElement as HTMLElement | null;

    lockBodyScroll();
    requestAnimationFrame(() => cancelBtnRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus();
    };
  }, [mounted, onCancel, open, pending]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClick={pending ? undefined : onCancel}
    >
      <div
        ref={dialogRef}
        className="panel w-full max-w-md overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-5 py-4 md:px-6">
          <p className="section-label mb-0">{titleEn}</p>
          <h2 id={titleId} className="font-display text-lg text-gold md:text-xl">
            {titleJa}
          </h2>
        </div>
        <div className="px-5 py-5 md:px-6">
          <p id={messageId} className="text-sm leading-relaxed text-cream-muted">
            {message}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="btn-ghost min-h-11 px-5 disabled:opacity-40"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="btn-primary min-h-11 px-5 disabled:opacity-40"
            >
              {pending ? "処理中…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
