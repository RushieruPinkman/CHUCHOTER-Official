import {
  GACHA_RARITIES,
  getPrizeByRarity,
  isGachaMiss,
  type GachaCastSnapshot,
  type GachaDrawResult,
  type GachaRarity,
} from "@/lib/gacha";

export const GACHA_HISTORY_UPDATED_EVENT = "chuchoter-gacha-history-updated";
const GACHA_HISTORY_PREFIX = "chuchoter-gacha-history";
const GACHA_HISTORY_MAX_ENTRIES = 100;

export interface GachaDrawHistoryRecord {
  id: string;
  result: GachaDrawResult;
}

/** ログイン中アカウントの userKey のみ。未ログイン時は null（保存しない） */
export function buildGachaHistoryKey(userKey: string | null): string | null {
  if (!userKey) return null;
  return `${GACHA_HISTORY_PREFIX}:${userKey}`;
}

function isGachaRarity(value: unknown): value is GachaRarity {
  return typeof value === "number" && GACHA_RARITIES.includes(value as GachaRarity);
}

function normalizeCastSnapshot(value: unknown): GachaCastSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;

  const cast = value as GachaCastSnapshot;
  if (!cast.id || !cast.name || !cast.image) return undefined;

  return {
    id: cast.id,
    name: cast.name,
    nameEn: cast.nameEn ?? "",
    image: cast.image,
    gender: cast.gender === "male" ? "male" : cast.gender === "female" ? "female" : undefined,
  };
}

function normalizeDrawResult(value: unknown): GachaDrawResult | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as GachaDrawResult;
  if (!isGachaRarity(raw.rarity) || typeof raw.wonAt !== "string") return null;

  const prize = raw.prize ?? getPrizeByRarity(raw.rarity);
  if (!prize?.title) return null;

  return {
    rarity: raw.rarity,
    prize,
    wonAt: raw.wonAt,
    cast: normalizeCastSnapshot(raw.cast),
  };
}

export function readGachaDrawHistory(historyKey: string): GachaDrawHistoryRecord[] {
  if (typeof window === "undefined" || !historyKey) return [];

  try {
    const raw = window.localStorage.getItem(historyKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as GachaDrawHistoryRecord[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((record) => {
        const result = normalizeDrawResult(record?.result);
        if (!record?.id || !result) return null;
        return { id: record.id, result };
      })
      .filter((record): record is GachaDrawHistoryRecord => record !== null)
      .sort(
        (a, b) => new Date(b.result.wonAt).getTime() - new Date(a.result.wonAt).getTime()
      );
  } catch {
    return [];
  }
}

function writeGachaDrawHistory(historyKey: string, records: GachaDrawHistoryRecord[]): void {
  window.localStorage.setItem(historyKey, JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(GACHA_HISTORY_UPDATED_EVENT, { detail: { historyKey } })
  );
}

export function appendGachaDrawHistory(
  historyKey: string,
  result: GachaDrawResult
): GachaDrawHistoryRecord[] {
  if (typeof window === "undefined" || !historyKey) return [];

  const records = readGachaDrawHistory(historyKey);
  const record: GachaDrawHistoryRecord = {
    id: `draw-${Date.now()}`,
    result,
  };
  const nextRecords = [record, ...records].slice(0, GACHA_HISTORY_MAX_ENTRIES);

  writeGachaDrawHistory(historyKey, nextRecords);
  return nextRecords;
}

export function formatGachaHistoryTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function getGachaHistorySummary(result: GachaDrawResult): string {
  if (isGachaMiss(result.rarity) && result.cast?.name) {
    return result.cast.name;
  }
  return result.prize.title;
}
