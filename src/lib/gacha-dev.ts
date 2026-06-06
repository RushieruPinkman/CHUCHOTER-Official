import { GACHA_RARITIES, type GachaRarity } from "@/lib/gacha";

/** 開発環境（next dev）でのみ true。本番ビルドでは常に false */
export function isGachaDevEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

const DEV_RATE = 100 / GACHA_RARITIES.length;

/** ローカル試験用：★1〜★6 均等（各 1/6） */
export const GACHA_DEV_RATES: Record<GachaRarity, number> = {
  1: DEV_RATE,
  2: DEV_RATE,
  3: DEV_RATE,
  4: DEV_RATE,
  5: DEV_RATE,
  6: DEV_RATE,
};

export function formatGachaDevRatePercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export const GACHA_DEV_PAGE_PATH = "/gacha/dev" as const;
