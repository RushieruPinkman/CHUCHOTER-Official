"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GachaDrawHistory from "@/components/GachaDrawHistory";
import GachaPrizeCard from "@/components/GachaPrizeCard";
import GachaResultModal from "@/components/GachaResultModal";
import GachaSharePanel from "@/components/GachaSharePanel";
import GachaDoorReveal from "@/components/GachaDoorReveal";
import GachaStageIndicator from "@/components/GachaStageIndicator";
import GachaTenResultModal from "@/components/GachaTenResultModal";
import GachaVfx, { GachaRateList } from "@/components/GachaVfx";
import ScrollReveal from "@/components/ScrollReveal";
import DailyTasksPanel from "@/components/DailyTasksPanel";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { useGachaUserDataSync } from "@/hooks/useGachaUserDataSync";
import { useCpBalance } from "@/hooks/useCpBalance";
import { CP_GACHA_SINGLE_COST, CP_GACHA_TEN_COST } from "@/lib/cp";
import { GACHA_SERIAL_UNUSED_RETENTION_DAYS } from "@/lib/gacha-serial";
import { drawGacha } from "@/lib/cp-client";
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
import {
  formatGachaDevRatePercent,
  GACHA_DEV_RATES,
  isGachaDevEnabled,
} from "@/lib/gacha-dev";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { registerGachaCollectionFromDraw } from "@/lib/gacha-collection";
import {
  isRemoteCollectionUserKey,
} from "@/lib/gacha-collection-client";
import { appendGachaDrawHistory, buildGachaHistoryKey } from "@/lib/gacha-history";
import { useGachaSerialStatusSync } from "@/hooks/useGachaSerialStatus";

type GachaMachineMode = "production" | "dev";

interface GachaMachineProps {
  casts: GachaCastSnapshot[];
  mode?: GachaMachineMode;
}

type DrawPhase = "idle" | "stage1" | "stage2" | "stage3" | "impact" | "result";
type PresentationStage = 1 | 2 | 3;

const PRESENTING_PHASES: DrawPhase[] = ["stage1", "stage2", "stage3"];
const DRAWING_PHASES: DrawPhase[] = [...PRESENTING_PHASES, "impact"];

export default function GachaMachine({ casts, mode = "production" }: GachaMachineProps) {
  const isDevMode = mode === "dev" && isGachaDevEnabled();
  const activeRates = isDevMode ? GACHA_DEV_RATES : RARITY_RATE;
  const { userKey: collectionUserKey, ready: authReady } = useCollectionUserKey();
  const { resync: resyncUserData } = useGachaUserDataSync(collectionUserKey, { authReady });
  const {
    balance: cpBalance,
    freeDrawAvailable,
    enabled: cpEnabled,
    loading: cpLoading,
  } = useCpBalance();
  const historyKey = buildGachaHistoryKey(collectionUserKey);
  const loginNextPath = isDevMode ? "/gacha/dev" : "/gacha";
  const isLoggedIn = Boolean(collectionUserKey);

  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [previewPrize, setPreviewPrize] = useState<GachaPrize | null>(null);
  const [previewRarity, setPreviewRarity] = useState<GachaRarity | null>(null);
  const [result, setResult] = useState<GachaDrawResult | null>(null);
  const [pendingDraw, setPendingDraw] = useState<GachaDrawResult | null>(null);
  const [displayRarity, setDisplayRarity] = useState<GachaRarity | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promotionDelta, setPromotionDelta] = useState(0);
  const [previewCast, setPreviewCast] = useState<GachaCastSnapshot | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [historyModalResult, setHistoryModalResult] = useState<GachaDrawResult | null>(null);
  const [tenDrawResults, setTenDrawResults] = useState<GachaDrawResult[] | null>(null);
  const [tenDetailDraw, setTenDetailDraw] = useState<GachaDrawResult | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [issuingSerial, setIssuingSerial] = useState(false);
  const timersRef = useRef<number[]>([]);

  const isDrawing = DRAWING_PHASES.includes(phase);
  const isPresenting = PRESENTING_PHASES.includes(phase);
  const canAffordSingle = isDevMode || (cpEnabled && cpBalance >= CP_GACHA_SINGLE_COST);
  const canAffordTen = isDevMode || (cpEnabled && cpBalance >= CP_GACHA_TEN_COST);
  const canFreeDraw =
    !isDrawing &&
    hydrated &&
    !isDevMode &&
    isLoggedIn &&
    !cpLoading &&
    cpEnabled &&
    freeDrawAvailable;
  const canCpDraw =
    !isDrawing &&
    hydrated &&
    !isDevMode &&
    isLoggedIn &&
    !cpLoading &&
    cpEnabled &&
    canAffordSingle;
  const canTenDraw =
    !isDrawing &&
    hydrated &&
    !isDevMode &&
    isLoggedIn &&
    !cpLoading &&
    cpEnabled &&
    canAffordTen;
  const finalRarity = pendingDraw?.rarity ?? result?.rarity ?? null;
  const syncedResult = useGachaSerialStatusSync(result, collectionUserKey);
  const displayResult = syncedResult ?? result;
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

  useEffect(() => {
    setHydrated(true);
  }, []);

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

  const playDrawResult = useCallback(
    (draw: GachaDrawResult) => {
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
    },
    [clearDrawTimers, runStage]
  );

  const persistDrawResult = useCallback(
    (draw: GachaDrawResult) => {
      if (collectionUserKey && isRemoteCollectionUserKey(collectionUserKey)) {
        void resyncUserData();
        return;
      }

      registerGachaCollectionFromDraw(collectionUserKey, draw);
      if (historyKey) appendGachaDrawHistory(historyKey, draw);
    },
    [collectionUserKey, historyKey, resyncUserData]
  );

  const handleFreeDraw = async () => {
    if (!canFreeDraw || issuingSerial) return;

    setDrawError(null);
    setIssuingSerial(true);

    try {
      const response = await drawGacha({ payment: "free", count: 1 });
      const draw = response.draws[0]!;
      persistDrawResult(draw);
      playDrawResult(draw);
    } catch (error) {
      setDrawError(error instanceof Error ? error.message : "抽選処理に失敗しました。");
    } finally {
      setIssuingSerial(false);
    }
  };

  const handleCpDraw = async () => {
    if (!canCpDraw || issuingSerial) return;

    setDrawError(null);
    setIssuingSerial(true);

    try {
      const response = await drawGacha({ payment: "cp", count: 1 });
      const draw = response.draws[0]!;
      persistDrawResult(draw);
      playDrawResult(draw);
    } catch (error) {
      setDrawError(error instanceof Error ? error.message : "抽選処理に失敗しました。");
    } finally {
      setIssuingSerial(false);
    }
  };

  const handleDevDraw = async () => {
    if (isDrawing || issuingSerial || !isDevMode) return;

    setDrawError(null);
    setIssuingSerial(true);

    try {
      const draw = pickGachaPrize(casts, activeRates);
      persistDrawResult(draw);
      playDrawResult(draw);
    } finally {
      setIssuingSerial(false);
    }
  };

  const handleTenDraw = async () => {
    if (!canTenDraw || issuingSerial) return;

    setDrawError(null);
    setIssuingSerial(true);

    try {
      const response = await drawGacha({ payment: "cp", count: 10 });
      for (const draw of response.draws) {
        persistDrawResult(draw);
      }
      setTenDrawResults(response.draws);
    } catch (error) {
      setDrawError(error instanceof Error ? error.message : "10連抽選に失敗しました。");
    } finally {
      setIssuingSerial(false);
    }
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
    .map((r) => {
      const rate = activeRates[r as GachaRarity];
      const label = isDevMode ? formatGachaDevRatePercent(rate) : `${rate}%`;
      return `★${r} ${label}`;
    })
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
          <div className="gacha-machine panel mx-auto max-w-xl overflow-hidden p-4 md:p-8">
            <div className="gacha-machine__display">
            <div className="gacha-machine__frame border border-[var(--color-border)] bg-deep/90 p-5 text-center md:p-7">
                {isDevMode && (
                  <p className="mb-4 rounded border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
                    開発用サンドボックス — 回数無制限・確率均等。本番（/gacha）には反映されません。
                  </p>
                )}
                <p className="section-label mb-2">{isDevMode ? "Dev Draw" : "Prize Draw"}</p>
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
                        serialNumber={phase === "result" && displayResult ? displayResult.serialNumber : undefined}
                        serialStatus={phase === "result" && displayResult ? displayResult.serialStatus : undefined}
                      />
                    </div>
                  )}
                  </div>
                </div>

                {phase === "result" && result && isDevMode && (
                  <div className={`gacha-machine__result-msg gacha-machine__result-msg--r${result.rarity} mt-5`}>
                    <p className="text-sm leading-relaxed text-cream-muted">
                      【試験】{getResultMessage(result.rarity, result.prize.title, result.cast?.name)}
                    </p>
                  </div>
                )}

                {phase === "impact" && (
                  <p className="gacha-machine__status mt-4 text-xs tracking-[0.25em] text-cream-faint uppercase">
                    Reveal
                  </p>
                )}
            </div>
            </div>

            <div className="gacha-machine__controls">
            {phase === "result" && displayResult && !isDevMode && (
              <GachaSharePanel result={displayResult} loginNextPath={loginNextPath} />
            )}

            <div className="gacha-machine__meta mb-5 mt-6 px-1">
              {!isDevMode && authReady && isLoggedIn && cpEnabled && (
                <div className="gacha-machine__cp" role="status" aria-label={`所持 CP ${cpBalance}`}>
                  <p className="gacha-machine__cp-label">所持 CP</p>
                  <p className="gacha-machine__cp-value">{cpLoading ? "—" : cpBalance}</p>
                </div>
              )}
              <p className="mt-3 text-center text-[11px] leading-relaxed text-cream-faint">{rateSummary}</p>
              {!isDevMode && cpEnabled && (
                <p className="text-center text-[11px] leading-relaxed text-cream-faint">
                  無料 1回/日 + CP追加（1回 {CP_GACHA_SINGLE_COST} CP / 10連 {CP_GACHA_TEN_COST} CP）
                </p>
              )}
              {!isDevMode && authReady && !isLoggedIn && (
                <p className="text-center text-[11px] leading-relaxed text-cream-faint">
                  ログイン中のアカウントでのみ抽選できます。
                </p>
              )}
              {!isDevMode && authReady && isLoggedIn && !cpLoading && !cpEnabled && (
                <p className="text-center text-[11px] leading-relaxed text-amber-100/90">
                  CP 機能が未設定です。管理者は scripts/supabase-cp.sql を実行してください。
                </p>
              )}
              {!isDevMode && authReady && isLoggedIn && cpEnabled && !freeDrawAvailable && phase === "idle" && (
                <p className="text-center text-[11px] leading-relaxed text-cream-muted">
                  本日の無料ガチャは完了。CP で追加抽選できます。
                </p>
              )}
              {!isDevMode && authReady && isLoggedIn && cpEnabled && !canAffordSingle && !freeDrawAvailable && phase === "idle" && (
                <p className="text-center text-[11px] leading-relaxed text-cream-muted">
                  デイリータスク（無料ガチャ → Xシェア）で CP を貯めて追加抽選しましょう。
                </p>
              )}
              {isDevMode && (
                <p className="text-center text-[11px] leading-relaxed text-cream-faint">
                  試験モード：何度でも引き直せます（CP 消費なし）
                </p>
              )}
            </div>

            <div className="gacha-machine__actions mt-6 px-1">
              {phase === "result" ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-ghost gacha-machine__action--primary"
                >
                  {isDevMode ? "もう一度試す" : "扉に戻る"}
                </button>
              ) : !isDevMode && authReady && !isLoggedIn ? (
                <div className="gacha-machine__auth space-y-4 text-center">
                  <p className="text-sm leading-relaxed text-cream-muted">
                    運命の扉を開くにはログインが必要です。
                  </p>
                  <div className="gacha-machine__auth-actions">
                    <Link
                      href={getAuthLoginHref(loginNextPath)}
                      className="btn-primary inline-flex min-h-11 items-center justify-center px-6"
                    >
                      ログインして引く
                    </Link>
                    <Link
                      href={getAuthRegisterHref(loginNextPath)}
                      className="btn-ghost inline-flex min-h-11 items-center justify-center px-6"
                    >
                      新規登録
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="gacha-machine__draw-actions space-y-3">
                  {isDevMode ? (
                    <button
                      type="button"
                      onClick={handleDevDraw}
                      disabled={isDrawing || issuingSerial}
                      className="gacha-draw-btn btn-primary gacha-machine__action--primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {issuingSerial ? "抽選中…" : isDrawing ? "演出中…" : "試験抽選を開始"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleFreeDraw}
                        disabled={!canFreeDraw || issuingSerial}
                        className="gacha-draw-btn btn-primary gacha-machine__action--primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {!hydrated || !authReady || cpLoading
                          ? "読み込み中…"
                          : issuingSerial
                            ? "抽選中…"
                            : isPresenting || isDrawing
                              ? "演出中…"
                              : freeDrawAvailable
                                ? "無料で引く（本日1回）"
                                : "本日の無料抽選は完了"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCpDraw}
                        disabled={!canCpDraw || issuingSerial}
                        className="btn-ghost gacha-machine__action--primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {issuingSerial ? "抽選中…" : `CPで引く（${CP_GACHA_SINGLE_COST} CP）`}
                      </button>
                      <button
                        type="button"
                        onClick={handleTenDraw}
                        disabled={!canTenDraw || issuingSerial}
                        className="btn-ghost gacha-machine__action--primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {issuingSerial ? "10連抽選中…" : `10連（${CP_GACHA_TEN_COST} CP）`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center px-1">
              <Link href="/collection" className="btn-ghost min-h-11 px-6 text-center">
                コレクションを見る
              </Link>
            </div>

            {drawError && (
              <p className="mt-4 px-1 text-center text-sm leading-relaxed text-red-300" role="alert">
                {drawError}
              </p>
            )}
            </div>
          </div>

        {!isDevMode && (
          <ScrollReveal delay={0.05} className="mx-auto mt-10 max-w-xl">
            <DailyTasksPanel showGachaHint={false} />
          </ScrollReveal>
        )}

        <ScrollReveal delay={0.06} className="mt-10">
          <GachaDrawHistory
            userKey={collectionUserKey}
            loginNextPath={loginNextPath}
            onViewResult={setHistoryModalResult}
          />
        </ScrollReveal>

        {!isDevMode && (
        <ScrollReveal delay={0.08} className="mx-auto mt-8 max-w-lg text-center">
          <div className="space-y-1.5 text-xs leading-relaxed text-cream-faint">
            <p>★1はランダムで住人が現れます。</p>
            <p>★2〜★3の景品は当選後にサイトからダウンロードできます。</p>
            <p>
              ★4は
              <Link href="/dm" className="link-gold text-gold">
                運営DM
              </Link>
              に当選内容と希望のキャスト名をお送りください。
            </p>
            <p>
              ★5・★6は
              <Link href="/dm" className="link-gold text-gold">
                運営DM
              </Link>
              に当選内容・シリアルNo.をお送りください（★5は希望のキャスト名も）。
            </p>
            <p className="text-[10px] text-cream-faint/80">
              シリアルNo.は★5以上の景品にのみ発行されます。未使用のシリアルNo.は発行から
              {GACHA_SERIAL_UNUSED_RETENTION_DAYS}日後に自動削除されます。
            </p>
          </div>
        </ScrollReveal>
        )}
      </div>
      {historyModalResult && (
        <GachaResultModal
          result={historyModalResult}
          onClose={() => setHistoryModalResult(null)}
          userKey={collectionUserKey}
          titleEn="History"
          titleJa="抽選結果"
        />
      )}
      {tenDrawResults && (
        <GachaTenResultModal
          draws={tenDrawResults}
          onClose={() => setTenDrawResults(null)}
          onViewDraw={setTenDetailDraw}
        />
      )}
      {tenDetailDraw && (
        <GachaResultModal
          result={tenDetailDraw}
          onClose={() => setTenDetailDraw(null)}
          userKey={collectionUserKey}
          titleEn="10 Draws"
          titleJa="10連結果"
        />
      )}
    </section>
  );
}
