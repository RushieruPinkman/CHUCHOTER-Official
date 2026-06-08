import type { GachaDrawResult } from "@/lib/gacha";

export const GACHA_DAILY_STORAGE_KEY = "chuchoter-gacha-daily";
export const GACHA_TIMEZONE = "Asia/Tokyo";

/** 本番ガチャ：日本時間で1日1回 */
export const GACHA_DAILY_LIMIT_ENABLED = true;

export function isGachaDailyLimitEnabled(): boolean {
  return GACHA_DAILY_LIMIT_ENABLED;
}

export interface GachaDailyRecord {
  /** 日本時間での抽選日（YYYY-MM-DD） */
  drawDate: string;
  result: GachaDrawResult;
}

/** 日本時間の暦日（YYYY-MM-DD） */
export function getGachaDayJst(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GACHA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hasDrawnGachaToday(record: GachaDailyRecord | null, now = new Date()): boolean {
  if (!record) return false;
  return record.drawDate === getGachaDayJst(now);
}

/** 次の日本時間0:00までのミリ秒 */
export function getMsUntilNextGachaReset(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GACHA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const elapsedMs = ((hour * 60 + minute) * 60 + second) * 1000;
  return 24 * 60 * 60 * 1000 - elapsedMs;
}

export function formatGachaCooldownMessage(now = new Date()): string {
  const ms = getMsUntilNextGachaReset(now);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `本日の抽選は完了しています。次回は日本時間0:00まであと ${hours}時間${minutes}分です。`;
  }
  if (minutes > 0) {
    return `本日の抽選は完了しています。次回は日本時間0:00まであと ${minutes}分です。`;
  }
  return "本日の抽選は完了しています。次回は日本時間0:00以降にご利用ください。";
}

export function readGachaDailyRecord(): GachaDailyRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(GACHA_DAILY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GachaDailyRecord;
  } catch {
    return null;
  }
}

export function writeGachaDailyRecord(result: GachaDrawResult): void {
  if (!GACHA_DAILY_LIMIT_ENABLED || typeof window === "undefined") return;

  const record: GachaDailyRecord = {
    drawDate: getGachaDayJst(),
    result,
  };
  window.localStorage.setItem(GACHA_DAILY_STORAGE_KEY, JSON.stringify(record));
}

export function canDrawGachaToday(now = new Date()): boolean {
  if (!GACHA_DAILY_LIMIT_ENABLED) return true;
  return !hasDrawnGachaToday(readGachaDailyRecord(), now);
}

export function restoreTodaysGachaRecord(now = new Date()): GachaDailyRecord | null {
  if (!GACHA_DAILY_LIMIT_ENABLED) return null;
  const record = readGachaDailyRecord();
  return hasDrawnGachaToday(record, now) ? record : null;
}
