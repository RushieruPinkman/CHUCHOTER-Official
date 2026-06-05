"use client";

import type { CSSProperties } from "react";
import type { GachaRarity } from "@/lib/gacha";
import { getRarityLabel, GACHA_RARITIES } from "@/lib/gacha";

type GachaVfxPhase = "idle" | "stage1" | "stage2" | "stage3" | "impact" | "result";

interface GachaVfxProps {
  active: boolean;
  phase: GachaVfxPhase;
  displayRarity: GachaRarity | null;
  finalRarity: GachaRarity | null;
  promoting?: boolean;
  promotionDelta?: number;
}

export function GachaRarityStars({
  rarity,
  large = false,
  promoting = false,
  promotionDelta = 0,
}: {
  rarity: GachaRarity;
  large?: boolean;
  promoting?: boolean;
  promotionDelta?: number;
  stage?: 1 | 2 | 3;
}) {
  return (
    <div
      className={[
        `gacha-stars gacha-stars--r${rarity}`,
        large ? "gacha-stars--lg" : "",
        rarity === 6 ? "gacha-stars--sparkle" : "",
        promoting ? "gacha-stars--promote" : "",
        promoting && promotionDelta >= 2 ? "gacha-stars--promote-double" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`レアリティ ${rarity}つ星`}
    >
      {getRarityLabel(rarity)}
    </div>
  );
}

function confettiCount(rarity: GachaRarity): number {
  if (rarity >= 6) return 32;
  if (rarity >= 5) return 24;
  if (rarity >= 4) return 18;
  if (rarity >= 3) return 14;
  return 10;
}

export default function GachaVfx({
  active,
  phase,
  displayRarity,
  finalRarity,
  promoting = false,
  promotionDelta = 0,
}: GachaVfxProps) {
  const rarity = displayRarity ?? finalRarity;
  if (!active || !rarity) return null;

  const isDoorPhase = phase === "stage1" || phase === "stage2" || phase === "stage3";
  const showGuaranteed = phase === "stage3" && finalRarity === 6 && rarity === 6;
  const showImpact = phase === "impact";
  const showAura =
    phase === "result" ||
    phase === "impact" ||
    showGuaranteed ||
    isDoorPhase;

  return (
    <div className="gacha-vfx pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {rarity === 6 && (showAura || showGuaranteed) && <div className="gacha-vfx__gold-sparkles" />}

      <div className={`gacha-vfx__bg gacha-vfx__bg--r${rarity} ${showAura ? "is-active" : ""}`} />

      {promoting && (
        <div
          className={`gacha-vfx__promote-flash ${promotionDelta >= 2 ? "gacha-vfx__promote-flash--double" : ""}`}
        />
      )}

      {showGuaranteed && (
        <div className="gacha-vfx__guaranteed gacha-vfx__guaranteed--r6">
          <div className="gacha-vfx__guaranteed-flash" />
          <div className="gacha-vfx__guaranteed-rays" />
          <p className="gacha-vfx__guaranteed-text">確定</p>
          <p className="gacha-vfx__guaranteed-sub">★★★★★★</p>
        </div>
      )}

      {showImpact && (
        <>
          <div className={`gacha-vfx__burst gacha-vfx__burst--r${rarity}`} />
          <div className={`gacha-vfx__ring gacha-vfx__ring--r${rarity}`} />
          <div className="gacha-vfx__shockwave" />
        </>
      )}

      {(phase === "result" || phase === "impact") && finalRarity && (
        <div className={`gacha-vfx__confetti gacha-vfx__confetti--r${finalRarity}`}>
          {Array.from({ length: confettiCount(finalRarity) }).map((_, i) => (
            <span key={i} className="gacha-vfx__particle" style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GachaRateList() {
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[10px] tracking-widest">
      {GACHA_RARITIES.map((r) => (
        <span key={r} className={`gacha-rate gacha-rate--r${r}`}>
          ★{r}
        </span>
      ))}
    </div>
  );
}
