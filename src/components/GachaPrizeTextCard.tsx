"use client";

import { GachaRarityStars } from "@/components/GachaVfx";
import {
  formatGachaWonAt,
  getGachaPrizeCardDisplay,
  getRarityLabel,
  RARITY_COLORS,
  shouldShowGachaWonAt,
  type GachaPrize,
  type GachaRarity,
} from "@/lib/gacha";

interface GachaPrizeTextCardProps {
  prize: GachaPrize;
  rarity: GachaRarity;
  /** スロット内のコンパクト表示 */
  compact?: boolean;
  /** 当選証明ヘッダー（共有・保存カード用） */
  showProofHeader?: boolean;
  /** フッター（サイトURL等） */
  footer?: string;
  /** ★4以上の獲得日時（ISO 8601） */
  wonAt?: string;
}

export default function GachaPrizeTextCard({
  prize,
  rarity,
  compact = false,
  showProofHeader = false,
  footer,
  wonAt,
}: GachaPrizeTextCardProps) {
  const colors = RARITY_COLORS[rarity];
  const showWonAt = shouldShowGachaWonAt(rarity) && wonAt;
  const isShareCard = showProofHeader;
  const display = isShareCard ? getGachaPrizeCardDisplay(prize, rarity) : null;

  return (
    <div
      className={`gacha-prize-text gacha-prize-text--r${rarity} flex h-full flex-col text-center ${
        isShareCard ? "gacha-prize-text--share items-center justify-center" : "items-center justify-center"
      } ${compact ? "gap-3 p-5" : "gap-4 p-6 md:p-8"}`}
    >
      {rarity === 6 && <div className="gacha-prize-text__sparkles" aria-hidden="true" />}

      {showProofHeader && (
        <>
          <p className="gacha-prize-text__brand">CHUCHOTER</p>
          <p className="gacha-prize-text__event">運命の扉 — 当選証明</p>
        </>
      )}

      <GachaRarityStars rarity={rarity} large={!compact} />

      <div
        className={`relative z-[1] ${isShareCard ? "flex w-full flex-col items-center gap-2" : "space-y-2"}`}
      >
        {isShareCard && display ? (
          <>
            <p className={`font-display text-gold ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
              {display.primary}
            </p>
            {display.secondary && (
              <p className={`tracking-widest text-cream-muted ${compact ? "text-[10px]" : "text-xs"}`}>
                {display.secondary}
              </p>
            )}
            {display.detail && (
              <p className={`leading-relaxed text-cream-faint ${compact ? "text-[11px]" : "text-xs md:text-sm"}`}>
                {display.detail}
              </p>
            )}
          </>
        ) : (
          <>
            <p className={`font-display text-gold ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
              {prize.title}
            </p>
            <p className={`tracking-widest text-cream-muted ${compact ? "text-[10px]" : "text-xs"}`}>
              {prize.subtitle}
            </p>
            <p className={`leading-relaxed text-cream-faint ${compact ? "text-[11px]" : "text-xs md:text-sm"}`}>
              {prize.description}
            </p>
          </>
        )}
      </div>

      <p className={`relative z-[1] tracking-widest text-cream-faint ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {getRarityLabel(rarity)} · {colors.label}
      </p>

      {showWonAt && (
        <p className={`gacha-prize-text__won-at relative z-[1] text-cream-muted ${compact ? "text-[10px]" : "text-xs"}`}>
          獲得日時: {formatGachaWonAt(wonAt)}
        </p>
      )}

      {footer && (
        <p className="relative z-[1] text-[10px] text-cream-faint">{footer}</p>
      )}
    </div>
  );
}
