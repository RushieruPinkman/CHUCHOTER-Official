"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BonusRouletteWheel from "@/components/BonusRouletteWheel";
import { BONUS_TYPE_LABELS, formatBonusCooldown } from "@/lib/bonus-period";
import {
  collectBonusRoulette,
  spinBonusRoulette,
} from "@/lib/bonus-roulette-client";
import type { BonusRouletteEntry } from "@/lib/bonus-roulette-store";

type CardPhase = "idle" | "ready" | "spinning" | "result" | "done";

interface BonusRouletteCardProps {
  entry: BonusRouletteEntry;
  onEntryChange: (entry: BonusRouletteEntry) => void;
  disabled?: boolean;
  devMode?: boolean;
}

export default function BonusRouletteCard({
  entry,
  onEntryChange,
  disabled = false,
  devMode = false,
}: BonusRouletteCardProps) {
  const labels = BONUS_TYPE_LABELS[entry.type];
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [activeEntry, setActiveEntry] = useState(entry);
  const [spinKey, setSpinKey] = useState(0);
  const [wheelRevealKey, setWheelRevealKey] = useState(0);
  const [pendingPrizeIndex, setPendingPrizeIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phaseRef = useRef<CardPhase>("idle");
  const spunEntryRef = useRef<BonusRouletteEntry | null>(null);

  phaseRef.current = phase;

  useEffect(() => {
    setActiveEntry(entry);
    if (phaseRef.current === "spinning") return;

    if (devMode) {
      if (phaseRef.current === "spinning") return;
      if (entry.status === "pending") {
        setPhase("result");
        return;
      }
      if (entry.status === "available") {
        setPhase((current) =>
          current === "ready" || current === "result" ? "ready" : "idle"
        );
        return;
      }
      setPhase("idle");
      return;
    }
    if (entry.status === "pending") {
      setPhase("result");
      return;
    }
    if (entry.status === "collected") {
      setPhase("done");
      return;
    }
    setPhase("idle");
  }, [devMode, entry]);

  const clientOptions = devMode ? { forceDev: true as const } : undefined;

  const handleOpen = useCallback(() => {
    if (entry.status !== "available" && !devMode) return;
    if (disabled) return;
    setError(null);
    setWheelRevealKey((key) => key + 1);
    setPhase("ready");
  }, [devMode, disabled, entry.status]);

  const handleSpin = useCallback(async () => {
    if (busy || disabled || phase === "spinning") return;
    setBusy(true);
    setError(null);
    setPendingPrizeIndex(null);
    setPhase("spinning");
    setSpinKey((key) => key + 1);

    try {
      const result = await spinBonusRoulette(entry.type, clientOptions);
      spunEntryRef.current = result.entry;
      setActiveEntry(result.entry);
      setPendingPrizeIndex(result.entry.prizeIndex);
    } catch (spinError) {
      setError(spinError instanceof Error ? spinError.message : "抽選に失敗しました");
      setPendingPrizeIndex(null);
      setPhase("ready");
      setBusy(false);
    }
  }, [busy, clientOptions, disabled, entry.type, onEntryChange, phase]);

  const handleSpinEnd = useCallback(() => {
    if (spunEntryRef.current) {
      onEntryChange(spunEntryRef.current);
      spunEntryRef.current = null;
    }
    setPhase("result");
    setBusy(false);
    setPendingPrizeIndex(null);
  }, [onEntryChange]);

  const handleCollect = useCallback(async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);

    try {
      const result = await collectBonusRoulette(entry.type, clientOptions);
      setActiveEntry(result.entry);
      onEntryChange(result.entry);
      if (devMode) {
        setPhase("ready");
      } else {
        setPhase("done");
      }
    } catch (collectError) {
      setError(collectError instanceof Error ? collectError.message : "受け取りに失敗しました");
    } finally {
      setBusy(false);
    }
  }, [busy, clientOptions, devMode, disabled, entry.type, onEntryChange]);

  const showWheel = phase === "ready" || phase === "spinning" || phase === "result";
  const wheelPrizeIndex =
    phase === "ready" ? null : phase === "spinning" ? pendingPrizeIndex : activeEntry.prizeIndex;
  const wonCp = activeEntry.cpAmount;
  const canOpen = devMode || entry.status === "available";

  return (
    <article className={`bonus-roulette-card panel p-6 md:p-8${!devMode && entry.status === "collected" ? " bonus-roulette-card--done" : ""}`}>
      <header className="bonus-roulette-card__header">
        <div>
          <p className="section-label mb-2">{labels.titleEn}</p>
          <h2 className="font-display text-xl text-gold md:text-2xl">{labels.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">{labels.resetLabel}</p>
          {devMode && (
            <p className="mt-1 text-xs text-gold/80">開発試験：回数無制限・CP は累積されます</p>
          )}
        </div>
        {!devMode && entry.status === "collected" && wonCp !== null && (
          <div className="bonus-roulette-card__badge" aria-label={`受取済み ${wonCp} CP`}>
            <span className="bonus-roulette-card__badge-label">受取済</span>
            <span className="bonus-roulette-card__badge-value">+{wonCp} CP</span>
          </div>
        )}
      </header>

      {showWheel && (
        <div
          key={wheelRevealKey}
          className="bonus-roulette-card__wheel-wrap bonus-roulette-card__wheel-wrap--reveal mt-6"
        >
          <BonusRouletteWheel
            prizes={activeEntry.prizes}
            prizeIndex={wheelPrizeIndex}
            spinning={phase === "spinning"}
            spinKey={spinKey}
            onSpinEnd={handleSpinEnd}
          />
        </div>
      )}

      {phase === "result" && wonCp !== null && (
        <p className="bonus-roulette-card__result mt-4 text-center font-display text-2xl text-gold-bright">
          {wonCp} CP 獲得！
        </p>
      )}

      {phase === "done" && !devMode && (
        <p className="mt-4 text-center text-sm text-cream-muted" role="status">
          今期のボーナスは受け取り済みです。次回まであと{" "}
          <strong className="text-cream">{formatBonusCooldown(entry.nextResetMs)}</strong>
        </p>
      )}

      <div className="bonus-roulette-card__actions mt-6 flex flex-wrap justify-center gap-3">
        {phase === "idle" && canOpen && (
          <button type="button" className="btn-primary" onClick={handleOpen} disabled={disabled}>
            ボーナスを受け取る
          </button>
        )}

        {phase === "ready" && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSpin}
              disabled={busy || disabled}
            >
              {busy ? "抽選中…" : "ルーレットを回す"}
            </button>
            {!devMode && (
              <button
                type="button"
                className="btn-ghost px-5 py-3 text-[11px]"
                onClick={() => setPhase("idle")}
                disabled={busy}
              >
                戻る
              </button>
            )}
          </>
        )}

        {phase === "spinning" && (
          <button type="button" className="btn-primary" disabled aria-busy="true">
            抽選中…
          </button>
        )}

        {phase === "result" && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleCollect}
            disabled={busy || disabled}
          >
            {busy ? "処理中…" : "獲得"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
