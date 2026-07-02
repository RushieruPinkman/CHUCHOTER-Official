import type { BonusType } from "@/lib/bonus-period";

export interface BonusRoulettePrize {
  id: string;
  cp: number;
  weight: number;
  label: string;
  /** 報酬ティア（低いほど1）。ルーレット配色に使用 */
  tier: 1 | 2 | 3 | 4;
}

export const BONUS_ROULETTE_PRIZES: Record<BonusType, BonusRoulettePrize[]> = {
  daily: [
    { id: "daily-10", cp: 10, weight: 70, label: "10 CP", tier: 1 },
    { id: "daily-50", cp: 50, weight: 20, label: "50 CP", tier: 2 },
    { id: "daily-100", cp: 100, weight: 10, label: "100 CP", tier: 3 },
  ],
  weekly: [
    { id: "weekly-100", cp: 100, weight: 70, label: "100 CP", tier: 1 },
    { id: "weekly-500", cp: 500, weight: 20, label: "500 CP", tier: 2 },
    { id: "weekly-900", cp: 900, weight: 10, label: "900 CP", tier: 3 },
  ],
  monthly: [
    { id: "monthly-900", cp: 900, weight: 60, label: "900 CP", tier: 1 },
    { id: "monthly-1800", cp: 1800, weight: 25, label: "1800 CP", tier: 2 },
    { id: "monthly-3600", cp: 3600, weight: 13, label: "3600 CP", tier: 3 },
    { id: "monthly-9000", cp: 9000, weight: 2, label: "9000 CP", tier: 4 },
  ],
};

export interface BonusWheelSegment {
  prize: BonusRoulettePrize;
  prizeIndex: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  sweepAngle: number;
}

export function buildBonusWheelSegments(prizes: BonusRoulettePrize[]): BonusWheelSegment[] {
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let currentAngle = 0;

  return prizes.map((prize, index) => {
    const sweepAngle = (prize.weight / totalWeight) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    currentAngle = endAngle;

    return {
      prize,
      prizeIndex: index,
      startAngle,
      endAngle,
      midAngle,
      sweepAngle,
    };
  });
}

export function pickBonusWheelLandAngle(segment: BonusWheelSegment): number {
  const inset = Math.min(segment.sweepAngle * 0.15, 5);
  const minAngle = segment.startAngle + inset;
  const maxAngle = segment.endAngle - inset;
  if (maxAngle <= minAngle) {
    return segment.midAngle;
  }
  return minAngle + Math.random() * (maxAngle - minAngle);
}

export function computeBonusWheelLandRotation(
  currentRotation: number,
  landAngle: number,
  fullSpins = 5
): number {
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const targetMod = (360 - landAngle) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  return currentRotation + fullSpins * 360 + delta;
}

export interface BonusSpinResult {
  prizeIndex: number;
  prize: BonusRoulettePrize;
  cp: number;
}

export function pickBonusRoulettePrize(type: BonusType): BonusSpinResult {
  const prizes = BONUS_ROULETTE_PRIZES[type];
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (let index = 0; index < prizes.length; index += 1) {
    cumulative += prizes[index]!.weight;
    if (roll <= cumulative) {
      const prize = prizes[index]!;
      return { prizeIndex: index, prize, cp: prize.cp };
    }
  }

  const fallback = prizes[prizes.length - 1]!;
  return {
    prizeIndex: prizes.length - 1,
    prize: fallback,
    cp: fallback.cp,
  };
}
