import type { BonusType } from "@/lib/bonus-period";
import { getBonusPeriodKey, getMsUntilNextBonusReset } from "@/lib/bonus-period";
import { BONUS_ROULETTE_PRIZES, pickBonusRoulettePrize } from "@/lib/bonus-roulette";
import type { BonusRouletteEntry, BonusRouletteState } from "@/lib/bonus-roulette-store";
import { addDevCpBalance, getDevCpBalance } from "@/lib/cp-dev-balance";

const STORAGE_KEY = "chuchoter-bonus-roulette-dev";

interface DevBonusClaim {
  userKey: string;
  bonusType: BonusType;
  periodKey: string;
  cpAmount: number;
  prizeIndex: number;
  collectedAt: string | null;
}

const BONUS_TYPES: BonusType[] = ["daily", "weekly", "monthly"];

function readClaims(): DevBonusClaim[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DevBonusClaim[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClaims(claims: DevBonusClaim[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

function buildEntry(type: BonusType, claim: DevBonusClaim | null, now = new Date()): BonusRouletteEntry {
  const periodKey = getBonusPeriodKey(type, now);

  if (!claim || claim.periodKey !== periodKey) {
    return {
      type,
      status: "available",
      periodKey,
      cpAmount: null,
      prizeIndex: null,
      prizes: BONUS_ROULETTE_PRIZES[type],
      nextResetMs: getMsUntilNextBonusReset(type, now),
    };
  }

  if (claim.collectedAt) {
    return {
      type,
      status: "available",
      periodKey,
      cpAmount: null,
      prizeIndex: null,
      prizes: BONUS_ROULETTE_PRIZES[type],
      nextResetMs: getMsUntilNextBonusReset(type, now),
    };
  }

  return {
    type,
    status: "pending",
    periodKey,
    cpAmount: claim.cpAmount,
    prizeIndex: claim.prizeIndex,
    prizes: BONUS_ROULETTE_PRIZES[type],
    nextResetMs: getMsUntilNextBonusReset(type, now),
  };
}

function removeClaimForPeriod(
  claims: DevBonusClaim[],
  userKey: string,
  type: BonusType,
  periodKey: string
): DevBonusClaim[] {
  return claims.filter(
    (claim) =>
      !(
        claim.userKey === userKey &&
        claim.bonusType === type &&
        claim.periodKey === periodKey
      )
  );
}

export function getDevBonusRouletteState(userKey: string): BonusRouletteState {
  const now = new Date();
  const claims = readClaims().filter((claim) => claim.userKey === userKey);

  return {
    enabled: true,
    entries: BONUS_TYPES.map((type) => {
      const periodKey = getBonusPeriodKey(type, now);
      const claim =
        claims.find((item) => item.bonusType === type && item.periodKey === periodKey) ?? null;
      return buildEntry(type, claim, now);
    }),
  };
}

/** 開発試験用：毎回上書きして新規抽選（回数無制限） */
export function spinDevBonusRoulette(
  userKey: string,
  type: BonusType
): {
  entry: BonusRouletteEntry;
  alreadySpun: boolean;
} {
  const now = new Date();
  const periodKey = getBonusPeriodKey(type, now);
  const claims = readClaims();
  const spin = pickBonusRoulettePrize(type);
  const nextClaim: DevBonusClaim = {
    userKey,
    bonusType: type,
    periodKey,
    cpAmount: spin.cp,
    prizeIndex: spin.prizeIndex,
    collectedAt: null,
  };

  writeClaims([...removeClaimForPeriod(claims, userKey, type, periodKey), nextClaim]);

  return {
    entry: buildEntry(type, nextClaim, now),
    alreadySpun: false,
  };
}

/** 開発試験用：CP 付与後にクレームを消して再度回せるようにする */
export function collectDevBonusRoulette(
  userKey: string,
  type: BonusType
): {
  entry: BonusRouletteEntry;
  balance: number;
} {
  const now = new Date();
  const periodKey = getBonusPeriodKey(type, now);
  const claims = readClaims();
  const index = claims.findIndex(
    (claim) =>
      claim.userKey === userKey && claim.bonusType === type && claim.periodKey === periodKey
  );

  if (index < 0) {
    throw new Error("先にルーレットを回してください。");
  }

  const claim = claims[index]!;
  const balance = addDevCpBalance(userKey, claim.cpAmount);
  writeClaims(removeClaimForPeriod(claims, userKey, type, periodKey));

  return {
    entry: buildEntry(type, null, now),
    balance,
  };
}

/** 開発試験用：受取済み表示をリセット */
export function resetDevBonusRouletteEntry(userKey: string, type: BonusType): BonusRouletteEntry {
  const now = new Date();
  const periodKey = getBonusPeriodKey(type, now);
  writeClaims(removeClaimForPeriod(readClaims(), userKey, type, periodKey));
  return buildEntry(type, null, now);
}
