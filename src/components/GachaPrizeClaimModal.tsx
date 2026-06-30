"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { claimGachaPrizeFromApi } from "@/lib/gacha-prize-claim-client";
import { getGachaClaimSerial } from "@/lib/gacha-serial";
import { GACHA_SERIAL_STATUS_UPDATED_EVENT } from "@/lib/gacha-serial-client";
import { getRarityLabel, type GachaDrawResult } from "@/lib/gacha";

export interface GachaPrizeCastOption {
  id: string;
  name: string;
}

interface GachaPrizeClaimModalProps {
  open: boolean;
  onClose: () => void;
  result: GachaDrawResult;
  casts: GachaPrizeCastOption[];
  userKey: string;
  devMode: boolean;
  onClaimed?: () => void;
}

type Step = "select" | "confirm";

export default function GachaPrizeClaimModal({
  open,
  onClose,
  result,
  casts,
  userKey,
  devMode,
  onClaimed,
}: GachaPrizeClaimModalProps) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [castId, setCastId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serial = getGachaClaimSerial(result);
  const selectedCast = casts.find((cast) => cast.id === castId) ?? null;
  const activeCasts = casts.filter((cast) => cast.name.trim());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("select");
      setCastId("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;

    const prevFocus = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus();
    };
  }, [busy, mounted, onClose, open]);

  const handleConfirm = async () => {
    if (!serial || !selectedCast) return;

    setBusy(true);
    setError(null);

    try {
      await claimGachaPrizeFromApi(
        { serial, castId: selectedCast.id },
        devMode,
        userKey
      );

      window.dispatchEvent(new CustomEvent(GACHA_SERIAL_STATUS_UPDATED_EVENT));
      onClaimed?.();
      onClose();
      router.push("/dm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "景品の受け取りに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="panel w-full max-w-md overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 md:px-5">
          <div>
            <p className="section-label mb-0">Prize</p>
            <h2 id={titleId} className="font-display text-lg text-gold">
              景品を受け取る
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 md:px-5">
          <p className="text-sm leading-relaxed text-cream-muted">
            {getRarityLabel(result.rarity)}「{result.prize.title}」の受け取りです。希望のキャストを選んでください。
          </p>

          {step === "select" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs text-cream-muted">希望キャスト</span>
                <select
                  value={castId}
                  onChange={(event) => setCastId(event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-sm text-cream focus:border-gold focus:outline-none"
                >
                  <option value="">選択してください</option>
                  {activeCasts.map((cast) => (
                    <option key={cast.id} value={cast.id}>
                      {cast.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!castId}
                className="btn-primary w-full min-h-11 disabled:opacity-40"
              >
                次へ
              </button>
            </>
          )}

          {step === "confirm" && selectedCast && (
            <>
              <p className="rounded border border-[var(--color-border)] bg-deep/60 px-4 py-4 text-center text-sm leading-relaxed text-cream">
                <span className="text-gold">{selectedCast.name}</span>
                さんでよろしいですか？
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  disabled={busy}
                  className="btn-ghost min-h-11 flex-1 disabled:opacity-40"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy}
                  className="btn-primary min-h-11 flex-1 disabled:opacity-40"
                >
                  {busy ? "送信中…" : "確定する"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-center text-xs leading-relaxed text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
