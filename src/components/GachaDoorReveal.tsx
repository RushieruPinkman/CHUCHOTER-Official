"use client";

import { useLayoutEffect, useState, type CSSProperties } from "react";
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

interface DoorAngles {
  left: number;
  right: number;
}

const DOOR_ANGLES: Record<"closed" | "half" | "full", DoorAngles> = {
  closed: { left: 0, right: 0 },
  half: { left: -58, right: 58 },
  full: { left: -96, right: 96 },
};

export default function GachaDoorReveal({
  stage,
  rarity,
  promoting = false,
  promotionDelta = 0,
  idle = false,
}: GachaDoorRevealProps) {
  const stageClass = idle ? "gacha-door--idle" : `gacha-door--stage${stage}`;
  const doorControlled = !idle && stage >= 2;
  const [doorAngles, setDoorAngles] = useState<DoorAngles>(DOOR_ANGLES.closed);

  useLayoutEffect(() => {
    if (idle || stage === 1) {
      setDoorAngles(DOOR_ANGLES.closed);
      return;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

    const applyAngles = (angles: DoorAngles) => {
      if (!cancelled) setDoorAngles(angles);
    };

    if (stage === 2) {
      setDoorAngles(DOOR_ANGLES.closed);

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          applyAngles(DOOR_ANGLES.half);
        });
      });
    } else {
      raf1 = requestAnimationFrame(() => {
        applyAngles(DOOR_ANGLES.full);
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [stage, idle]);

  const leafClass = (side: "left" | "right") =>
    [
      "gacha-door__leaf",
      `gacha-door__leaf--${side}`,
      doorControlled ? "gacha-door__leaf--opening" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const leafStyle = (side: "left" | "right"): CSSProperties | undefined => {
    if (!doorControlled) return undefined;
    const angle = side === "left" ? doorAngles.left : doorAngles.right;
    return { transform: `rotateY(${angle}deg)` };
  };

  return (
    <div className={`gacha-door ${stageClass} gacha-door--r${rarity}`}>
      <div className="gacha-door__frame" aria-hidden="true">
        <div className="gacha-door__arch" />
        <div className="gacha-door__lintel" />
        <div className="gacha-door__jamb gacha-door__jamb--left" />
        <div className="gacha-door__jamb gacha-door__jamb--right" />
        <div className="gacha-door__light" />
        <div className="gacha-door__scene">
          <div className={leafClass("left")} style={leafStyle("left")}>
            <div className="gacha-door__leaf-body">
              <span className="gacha-door__face gacha-door__face--front" />
              <span className="gacha-door__face gacha-door__face--back" />
              <span className="gacha-door__face gacha-door__face--edge" />
              <span className="gacha-door__handle" />
            </div>
          </div>
          <div className={leafClass("right")} style={leafStyle("right")}>
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
