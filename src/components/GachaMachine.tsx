"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GachaPrizeCard from "@/components/GachaPrizeCard";
import GachaSharePanel from "@/components/GachaSharePanel";
import GachaDoorReveal from "@/components/GachaDoorReveal";
import GachaStageIndicator from "@/components/GachaStageIndicator";
import GachaVfx, { GachaRateList } from "@/components/GachaVfx";
import ScrollReveal from "@/components/ScrollReveal";
import XIcon from "@/components/XIcon";
import { SITE } from "@/lib/site";
import {
  canDrawGachaToday,
  formatGachaCooldownMessage,
  getMsUntilNextGachaReset,
  restoreTodaysGachaRecord,
  writeGachaDailyRecord,
} from "@/lib/gacha-daily-limit";
import {
  buildGachaPresentation,
  GACHA_TIMING,
  getResultMessage,
  getStageDuration,
  getStageLabel,
  getStageStatus,
  pickGachaPrize,
  RARITY_RATE,
  type GachaCastSnapshot,
  type GachaDrawResult,
  type GachaPrize,
  type GachaPresentation,
  type GachaRarity,
} from "@/lib/gacha";

type DrawPhase = "idle" | "stage1" | "stage2" | "stage3" | "impact" | "result";
type PresentationStage = 1 | 2 | 3;

const PRESENTING_PHASES: DrawPhase[] = ["stage1", "stage2", "stage3"];
const DRAWING_PHASES: DrawPhase[] = [...PRESENTING_PHASES, "impact"];

interface GachaMachineProps {
  casts: GachaCastSnapshot[];
}

export default function GachaMachine({ casts }: GachaMachineProps) {
  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [previewPrize, setPreviewPrize] = useState<GachaPrize | null>(null);
  const [previewRarity, setPreviewRarity] = useState<GachaRarity | null>(null);
  const [result, setResult] = useState<GachaDrawResult | null>(null);
  const [pendingDraw, setPendingDraw] = useState<GachaDrawResult | null>(null);
  const [displayRarity, setDisplayRarity] = useState<GachaRarity | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promotionDelta, setPromotionDelta] = useState(0);
  const [previewCast, setPreviewCast] = useState<GachaCastSnapshot | undefined>(undefined);
  const [dailyLocked, setDailyLocked] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const timersRef = useRef<number[]>([]);

  const isDrawing = DRAWING_PHASES.includes(phase);
  const isPresenting = PRESENTING_PHASES.includes(phase);
  const canDraw = !isDrawing && !dailyLocked && hydrated;
  const finalRarity = pendingDraw?.rarity ?? result?.rarity ?? null;
  const vfxRarity = displayRarity ?? finalRarity;

  const clearDrawTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => () => clearDrawTimers(), [clearDrawTimers]);

  const applyDailyRecord = useCallback((record: NonNullable<ReturnType<typeof restoreTodaysGachaRecord>>) => {
    setDailyLocked(true);
    setCooldownMessage(formatGachaCooldownMessage());
    setResult(record.result);
    setPreviewPrize(record.result.prize);
    setPreviewRarity(record.result.rarity);
    setPreviewCast(record.result.cast);
    setDisplayRarity(record.result.rarity);
    setPhase("result");
  }, []);

  useEffect(() => {
    const record = restoreTodaysGachaRecord();
    if (record) {
      applyDailyRecord(record);
    }
    setHydrated(true);
  }, [applyDailyRecord]);

  useEffect(() => {
    if (!dailyLocked) return;

    const updateCooldown = () => setCooldownMessage(formatGachaCooldownMessage());
    updateCooldown();
    const interval = window.setInterval(updateCooldown, 60_000);
    const timeout = window.setTimeout(() => {
      setDailyLocked(false);
      setCooldownMessage(null);
    }, getMsUntilNextGachaReset() + 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [dailyLocked]);

  const runStage = useCallback(
    (draw: GachaDrawResult, script: GachaPresentation, stage: PresentationStage) => {
      const phaseName = `stage${stage}` as DrawPhase;
      const prevRarity = stage > 1 ? script.stages[stage - 2] : null;
      const nextRarity = script.stages[stage - 1];
      const promotionStep = prevRarity !== null ? nextRarity - prevRarity : 0;
      const isPromotion = promotionStep > 0;

      setPhase(phaseName);
      setDisplayRarity(nextRarity);
      setPromotionDelta(isPromotion ? promotionStep : 0);
      setPromoting(isPromotion);

      if (isPromotion) {
        schedule(() => {
          setPromoting(false);
          setPromotionDelta(0);
        }, promotionStep >= 2 ? 950 : 650);
      }

      schedule(() => {
        if (stage < 3) {
          runStage(draw, script, (stage + 1) as PresentationStage);
          return;
        }

        setPromoting(false);
        setPromotionDelta(0);
        setPreviewPrize(draw.prize);
        setPreviewRarity(draw.rarity);
        setPreviewCast(draw.cast);
        setDisplayRarity(draw.rarity);
        setPhase("impact");

        schedule(() => {
          setResult(draw);
          setPhase("result");
        }, GACHA_TIMING.reveal);
      }, getStageDuration(stage, draw.rarity));
    },
    [schedule]
  );

  const handleDraw = () => {
    if (!canDraw || !canDrawGachaToday()) return;

    const draw = pickGachaPrize(casts);
    writeGachaDailyRecord(draw);
    setDailyLocked(true);
    setCooldownMessage(formatGachaCooldownMessage());
    const script = buildGachaPresentation(draw.rarity);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    clearDrawTimers();
    setResult(null);
    setPreviewPrize(null);
    setPreviewRarity(null);
    setPreviewCast(undefined);
    setPendingDraw(draw);
    setPromoting(false);
    setPromotionDelta(0);

    if (reducedMotion) {
      setDisplayRarity(draw.rarity);
      setPreviewPrize(draw.prize);
      setPreviewRarity(draw.rarity);
      setPreviewCast(draw.cast);
      setResult(draw);
      setPhase("result");
      return;
    }

    runStage(draw, script, 1);
  };

  const handleReset = () => {
    clearDrawTimers();
    setPhase("idle");
    setPreviewPrize(null);
    setPreviewRarity(null);
    setPreviewCast(undefined);
    setResult(null);
    setPendingDraw(null);
    setDisplayRarity(null);
    setPromoting(false);
    setPromotionDelta(0);
  };

  const currentStage: PresentationStage | null =
    phase === "stage1" ? 1 : phase === "stage2" ? 2 : phase === "stage3" ? 3 : null;

  const stageClass = [
    "gacha-machine__stage",
    vfxRarity ? `gacha-machine__stage--r${vfxRarity}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showPrize = (phase === "impact" || phase === "result") && previewPrize && previewRarity;
  const showPresentation = isPresenting && displayRarity !== null;

  const slotClass = [
    "gacha-machine__slot",
    phase === "stage1" ? "gacha-machine__slot--stage1" : "",
    phase === "stage2" ? "gacha-machine__slot--stage2" : "",
    phase === "stage3" ? "gacha-machine__slot--stage3" : "",
    phase === "stage3" && finalRarity === 6 ? "gacha-machine__slot--guaranteed" : "",
    promoting && promotionDelta >= 2
      ? "gacha-machine__slot--promote-double"
      : promoting
        ? "gacha-machine__slot--promote"
        : "",
    phase === "impact" ? "gacha-machine__slot--impact" : "",
    phase === "result" && result ? `gacha-machine__slot--r${result.rarity}` : "",
    isPresenting && displayRarity ? `gacha-machine__slot--r${displayRarity}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rateSummary = [1, 2, 3, 4, 5, 6]
    .map((r) => `★${r} ${RARITY_RATE[r as GachaRarity]}%`)
    .join(" / ");

  const statusText =
    currentStage && finalRarity
      ? getStageStatus(currentStage, finalRarity)
      : phase === "impact"
        ? "Reveal"
        : "Drawing…";

  const stageLabel =
    currentStage && finalRarity ? getStageLabel(currentStage, finalRarity) : null;

  return (
    <section className="pb-14 md:pb-16" aria-labelledby="gacha-heading">
      <div className="site-container">
        <ScrollReveal>
          <div className="gacha-machine panel mx-auto max-w-xl overflow-hidden p-4 md:p-8">
            <div className="gacha-machine__frame relative z-10 border border-[var(--color-border)] bg-deep/90 p-5 text-center md:p-7">
                <p className="section-label mb-2">Prize Draw</p>
                <h2 id="gacha-heading" className="sr-only">
                  景品ガチャ結果
                </h2>

                <div className={`${stageClass} mx-auto aspect-[4/5] max-w-[260px]`}>
                  <GachaVfx
                    active={isDrawing || phase === "result"}
                    phase={phase}
                    displayRarity={displayRarity}
                    finalRarity={finalRarity}
                    promoting={promoting}
                    promotionDelta={promotionDelta}
                  />

                  <div className={`${slotClass} h-full w-full`} aria-live="polite" aria-atomic="true">
                  {(phase === "idle" || showPresentation) && (
                    <div className="gacha-machine__door-layout">
                      <div className="gacha-door-viewport">
                        <GachaDoorReveal
                          stage={currentStage ?? 1}
                          rarity={displayRarity ?? 3}
                          idle={phase === "idle"}
                          promoting={promoting}
                          promotionDelta={promotionDelta}
                        />
                      </div>
                      <div className="gacha-machine__door-meta">
                        {phase === "idle" ? (
                          <GachaRateList />
                        ) : (
                          currentStage &&
                          displayRarity && (
                            <>
                              <GachaStageIndicator current={currentStage} />
                              {stageLabel && (
                                <p className="gacha-machine__drawing-label text-xs text-cream-faint">
                                  <span className="gacha-machine__drawing-label-main">{stageLabel}</span>
                                  <span className="gacha-machine__drawing-label-sep" aria-hidden="true">
                                    {" "}
                                    —{" "}
                                  </span>
                                  <span className="gacha-machine__drawing-label-sub">{statusText}</span>
                                </p>
                              )}
                            </>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {showPrize && (
                    <div className="absolute inset-0 z-[1]">
                      {phase === "result" && <div className="gacha-machine__result-shine" aria-hidden="true" />}
                      <GachaPrizeCard
                        prize={previewPrize}
                        rarity={previewRarity}
                        cast={previewCast}
                        showDetails={phase === "result"}
                        wonAt={phase === "result" && result ? result.wonAt : undefined}
                      />
                    </div>
                  )}
                  </div>
                </div>

                {phase === "result" && result && (
                  <div className={`gacha-machine__result-msg gacha-machine__result-msg--r${result.rarity} mt-5`}>
                    <p className="text-sm leading-relaxed text-cream-muted">
                      {getResultMessage(result.rarity, result.prize.title, result.cast?.name)}
                    </p>
                  </div>
                )}

                {phase === "impact" && (
                  <p className="gacha-machine__status mt-4 text-xs tracking-[0.25em] text-cream-faint uppercase">
                    Reveal
                  </p>
                )}
            </div>

            {phase === "result" && result && <GachaSharePanel result={result} />}

            <div className="relative z-10 mb-5 mt-6 px-1 space-y-1">
              <p className="text-[11px] leading-relaxed text-cream-faint">{rateSummary}</p>
              <p className="text-[11px] leading-relaxed text-cream-faint">
                1日1回まで（更新: 日本時間 毎日0:00）
              </p>
            </div>

            <div className="gacha-machine__actions relative z-10 mt-6 px-1">
              {phase === "result" ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-ghost gacha-machine__action--primary"
                >
                  {dailyLocked ? "扉に戻る" : "もう一度引く"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDraw}
                  disabled={!canDraw}
                  className="gacha-draw-btn btn-primary gacha-machine__action--primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!hydrated
                    ? "読み込み中…"
                    : dailyLocked
                      ? "本日の抽選は完了"
                      : isPresenting
                        ? "演出中…"
                        : isDrawing
                          ? "抽選中…"
                          : "扉を開ける"}
                </button>
              )}
            </div>

            {cooldownMessage && (
              <p className="relative z-10 mt-4 px-1 text-center text-xs leading-relaxed text-cream-muted" role="status">
                {cooldownMessage}
              </p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="mx-auto mt-8 max-w-lg text-center">
          <div className="space-y-1.5 text-xs leading-relaxed text-cream-faint">
            <p>★1はランダムで住人が現れます。</p>
            <p>★2〜★3の景品は当選後にサイトからダウンロードできます。</p>
            <p>
              ★4以上は
              <a
                href={SITE.xUrl}
                className="link-gold inline-flex align-middle text-gold"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="@CHUCHOTER_VRC"
              >
                <XIcon className="h-3.5 w-3.5" />
              </a>
              へのDMに当選カードを添付してご連絡ください。
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
