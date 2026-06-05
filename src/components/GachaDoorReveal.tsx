"use client";

import { GachaRarityStars } from "@/components/GachaVfx";
import type { GachaRarity } from "@/lib/gacha";

interface GachaDoorRevealProps {
  stage: 1 | 2 | 3;
  rarity: GachaRarity;
  promoting?: boolean;
  promotionDelta?: number;
  /** 待機中の閉じた扉 */
  idle?: boolean;
}

export default function GachaDoorReveal({
  stage,
  rarity,
  promoting = false,
  promotionDelta = 0,
  idle = false,
}: GachaDoorRevealProps) {
  const stageClass = idle ? "gacha-door--idle" : `gacha-door--stage${stage}`;

  return (
    <div className={`gacha-door ${stageClass} gacha-door--r${rarity}`}>
      <div className="gacha-door__frame" aria-hidden="true">
        <div className="gacha-door__arch" />
        <div className="gacha-door__lintel" />
        <div className="gacha-door__jamb gacha-door__jamb--left" />
        <div className="gacha-door__jamb gacha-door__jamb--right" />
        <div className="gacha-door__light" />
        <div className="gacha-door__scene">
          <div className="gacha-door__leaf gacha-door__leaf--left">
            <div className="gacha-door__leaf-body">
              <span className="gacha-door__face gacha-door__face--front" />
              <span className="gacha-door__face gacha-door__face--back" />
              <span className="gacha-door__face gacha-door__face--edge" />
              <span className="gacha-door__handle" />
            </div>
          </div>
          <div className="gacha-door__leaf gacha-door__leaf--right">
            <div className="gacha-door__leaf-body">
              <span className="gacha-door__face gacha-door__face--front" />
              <span className="gacha-door__face gacha-door__face--back" />
              <span className="gacha-door__face gacha-door__face--edge" />
              <span className="gacha-door__handle" />
            </div>
          </div>
        </div>
        <div className="gacha-door__threshold" />
      </div>

      <div className="gacha-door__inner">
        {!idle && (
          <>
            {stage === 3 && (
              <GachaRarityStars
                rarity={rarity}
                large
                promoting={promoting}
                promotionDelta={promotionDelta}
              />
            )}
            {promoting && (
              <p
                className={`gacha-door__promote-label ${promotionDelta >= 2 ? "gacha-door__promote-label--double" : ""}`}
              >
                {promotionDelta >= 2 ? "昇格 +2" : "昇格"}
              </p>
            )}
          </>
        )}
        {idle && (
          <>
            <span className="gacha-door__idle-mark" aria-hidden="true">
              ✦
            </span>
            <p className="gacha-door__idle-text text-xs leading-relaxed text-cream-faint">
              運命の扉の向こうに
              <br />
              景品が待っています
            </p>
          </>
        )}
      </div>
    </div>
  );
}
