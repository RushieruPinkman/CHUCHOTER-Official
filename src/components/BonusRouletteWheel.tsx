"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import {
  buildBonusWheelSegments,
  computeBonusWheelLandRotation,
  pickBonusWheelLandAngle,
  type BonusRoulettePrize,
  type BonusWheelSegment,
} from "@/lib/bonus-roulette";

interface BonusRouletteWheelProps {
  prizes: BonusRoulettePrize[];
  prizeIndex: number | null;
  spinning: boolean;
  spinKey: number;
  onSpinEnd?: () => void;
}

const CONST_SPIN_MS = 8000;
const DECEL_MS = 4000;
const FULL_SPINS = 5;
/** 減速開始までの定速回転（約 6 回転/秒）。8秒後に減速、12秒で停止。 */
const PRESPIN_DEG_PER_MS = (6 * 360) / 1000;
const CX = 100;
const CY = 100;
const RIM = 96;
const HUB = 34;
const MIN_LABEL_SWEEP = 10;

function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function describeArc(startAngle: number, endAngle: number, radius: number): string {
  const start = polarToCartesian(startAngle, radius);
  const end = polarToCartesian(endAngle, radius);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function BonusRouletteWheel({
  prizes,
  prizeIndex,
  spinning,
  spinKey,
  onSpinEnd,
}: BonusRouletteWheelProps) {
  const labelId = useId();
  const rotorRef = useRef<HTMLDivElement>(null);
  const spinSessionRef = useRef(0);
  const rotationRef = useRef(0);
  const pendingSegmentRef = useRef<BonusWheelSegment | null>(null);
  const segments = useMemo(() => buildBonusWheelSegments(prizes), [prizes]);

  useEffect(() => {
    if (!spinning || prizeIndex === null) return;
    const segment = segments[prizeIndex];
    if (segment) {
      pendingSegmentRef.current = segment;
    }
  }, [prizeIndex, segments, spinning]);

  useEffect(() => {
    if (!spinning) {
      pendingSegmentRef.current = null;
      return;
    }

    const rotor = rotorRef.current;
    if (!rotor) return;

    const session = spinSessionRef.current + 1;
    spinSessionRef.current = session;
    const spinStart = performance.now();
    rotationRef.current = 0;
    rotor.style.transform = "rotate(0deg)";

    let raf = 0;
    let landAnimation: Animation | null = null;
    let decelStarted = false;

    const beginDeceleration = () => {
      if (decelStarted || spinSessionRef.current !== session) return;

      const segment = pendingSegmentRef.current;
      if (!segment) return;

      decelStarted = true;
      const startRotation = rotationRef.current;
      const landAngle = pickBonusWheelLandAngle(segment);
      const targetRotation = computeBonusWheelLandRotation(
        startRotation,
        landAngle,
        FULL_SPINS
      );
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = prefersReducedMotion ? 0 : DECEL_MS;

      rotor.style.transform = `rotate(${startRotation}deg)`;

      landAnimation = rotor.animate(
        [
          { transform: `rotate(${startRotation}deg)` },
          { transform: `rotate(${targetRotation}deg)` },
        ],
        {
          duration,
          easing: "cubic-bezier(0.12, 0.82, 0.22, 1)",
          fill: "forwards",
        }
      );

      landAnimation.onfinish = () => {
        if (spinSessionRef.current !== session) return;
        rotationRef.current = targetRotation;
        rotor.style.transform = `rotate(${targetRotation}deg)`;
        onSpinEnd?.();
      };

      if (duration === 0) {
        rotationRef.current = targetRotation;
        rotor.style.transform = `rotate(${targetRotation}deg)`;
        onSpinEnd?.();
      }
    };

    const tick = (now: number) => {
      if (spinSessionRef.current !== session || decelStarted) return;

      const elapsed = now - spinStart;
      const rotation = elapsed * PRESPIN_DEG_PER_MS;
      rotationRef.current = rotation;
      rotor.style.transform = `rotate(${rotation}deg)`;

      if (elapsed >= CONST_SPIN_MS && pendingSegmentRef.current) {
        beginDeceleration();
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      landAnimation?.cancel();
    };
  }, [onSpinEnd, spinKey, spinning]);

  return (
    <div
      className={`bonus-roulette-wheel${segments.length >= 4 ? " bonus-roulette-wheel--dense" : ""}`}
      aria-hidden={prizeIndex === null && !spinning}
    >
      <div className="bonus-roulette-wheel__pointer" aria-hidden="true" />
      <div ref={rotorRef} className="bonus-roulette-wheel__rotor">
        <svg
          className="bonus-roulette-wheel__svg"
          viewBox="0 0 200 200"
          role="img"
          aria-label="ボーナスルーレット"
        >
          <defs>
            <filter id={`${labelId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.65" />
            </filter>
          </defs>
          <g>
            {segments.map((segment) => {
              const labelPos = polarToCartesian(segment.midAngle, 64);
              const showLabel = segment.sweepAngle >= MIN_LABEL_SWEEP;

              return (
                <g key={segment.prize.id}>
                  <path
                    d={describeArc(segment.startAngle, segment.endAngle, RIM)}
                    className={`bonus-roulette-wheel__segment bonus-roulette-wheel__segment--t${segment.prize.tier}`}
                  />
                  {showLabel && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${segment.midAngle}, ${labelPos.x}, ${labelPos.y})`}
                      className={`bonus-roulette-wheel__text bonus-roulette-wheel__text--t${segment.prize.tier}`}
                      filter={`url(#${labelId}-shadow)`}
                    >
                      {segment.prize.label}
                    </text>
                  )}
                </g>
              );
            })}
            <circle
              cx={CX}
              cy={CY}
              r={RIM}
              className="bonus-roulette-wheel__rim"
              fill="none"
              strokeWidth="2.5"
            />
            <circle cx={CX} cy={CY} r={HUB} className="bonus-roulette-wheel__hub-svg" />
          </g>
        </svg>
      </div>
    </div>
  );
}
