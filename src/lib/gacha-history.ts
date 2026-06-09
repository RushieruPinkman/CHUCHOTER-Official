import {
  GACHA_RARITIES,
  getPrizeByRarity,
  isGachaMiss,
  type GachaCastSnapshot,
  type GachaDrawResult,
  type GachaRarity,
} from "@/lib/gacha";
import { USER_HISTORY_MAX_ENTRIES } from "@/lib/history-limits";

export const GACHA_HISTORY_UPDATED_EVENT = "chuchoter-gacha-history-updated";
const GACHA_HISTORY_PREFIX = "chuchoter-gacha-history";
const GACHA_HISTORY_MAX_ENTRIES = USER_HISTORY_MAX_ENTRIES;

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
    serialNumber:
      typeof raw.serialNumber === "string" && raw.serialNumber.trim()
        ? raw.serialNumber.trim()
        : undefined,
    serialStatus:
      raw.serialStatus === "used" || raw.serialStatus === "issued" ? raw.serialStatus : undefined,
    cast: normalizeCastSnapshot(raw.cast),
  };
}

function parseGachaDrawHistoryRecords(parsed: unknown): GachaDrawHistoryRecord[] {
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
}

function trimGachaDrawHistoryRecords(
  records: GachaDrawHistoryRecord[]
): GachaDrawHistoryRecord[] {
  return records.slice(0, GACHA_HISTORY_MAX_ENTRIES);
}

function writeGachaDrawHistory(historyKey: string, records: GachaDrawHistoryRecord[]): void {
  if (typeof window === "undefined" || !historyKey) return;

  window.localStorage.setItem(historyKey, JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(GACHA_HISTORY_UPDATED_EVENT, { detail: { historyKey } })
  );
}

export function readGachaDrawHistory(historyKey: string): GachaDrawHistoryRecord[] {
  if (typeof window === "undefined" || !historyKey) return [];

  try {
    const raw = window.localStorage.getItem(historyKey);
    if (!raw) return [];

    const records = parseGachaDrawHistoryRecords(JSON.parse(raw));
    const trimmed = trimGachaDrawHistoryRecords(records);

    if (trimmed.length !== records.length) {
      writeGachaDrawHistory(historyKey, trimmed);
    }

    return trimmed;
  } catch {
    return [];
  }
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
  const nextRecords = trimGachaDrawHistoryRecords([record, ...records]);

  writeGachaDrawHistory(historyKey, nextRecords);
  return nextRecords;
}

export function clearGachaDrawHistory(historyKey: string): void {
  if (typeof window === "undefined" || !historyKey) return;
  writeGachaDrawHistory(historyKey, []);
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

export function updateGachaDrawHistorySerialStatus(
  historyKey: string,
  serialNumber: string,
  serialStatus: import("@/lib/gacha-serial").GachaSerialStatus
): void {
  if (typeof window === "undefined" || !historyKey) return;

  const normalized = serialNumber.trim();
  if (!normalized) return;

  const records = readGachaDrawHistory(historyKey);
  let changed = false;

  const nextRecords = records.map((record) => {
    if (record.result.serialNumber?.trim() !== normalized) return record;
    changed = true;
    return {
      ...record,
      result: {
        ...record.result,
        serialStatus,
      },
    };
  });

  if (changed) {
    writeGachaDrawHistory(historyKey, nextRecords);
  }
}

export function getGachaHistorySummary(result: GachaDrawResult): string {
  if (isGachaMiss(result.rarity) && result.cast?.name) {
    return result.cast.name;
  }
  return result.prize.title;
}
