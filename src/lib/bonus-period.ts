import { GACHA_TIMEZONE, getGachaDayJst, getMsUntilNextGachaReset } from "@/lib/gacha-daily-limit";

export type BonusType = "daily" | "weekly" | "monthly";

const JST_WEEKDAY_MONDAY_ZERO: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 日本時間の曜日（月=0 … 日=6） */
export function getJstWeekdayMondayZero(date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: GACHA_TIMEZONE,
    weekday: "short",
  }).format(date);
  return JST_WEEKDAY_MONDAY_ZERO[weekday] ?? 0;
}

/** 当該週の月曜日（YYYY-MM-DD、日本時間） */
export function getBonusWeekJst(date = new Date()): string {
  const day = getGachaDayJst(date);
  const offset = getJstWeekdayMondayZero(date);
  return addDaysToDateString(day, -offset);
}

/** 当該月（YYYY-MM、日本時間） */
export function getBonusMonthJst(date = new Date()): string {
  return getGachaDayJst(date).slice(0, 7);
}

export function getBonusPeriodKey(type: BonusType, date = new Date()): string {
  switch (type) {
    case "daily":
      return getGachaDayJst(date);
    case "weekly":
      return getBonusWeekJst(date);
    case "monthly":
      return getBonusMonthJst(date);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 次の週次リセット（月曜 0:00 JST）までのミリ秒 */
export function getMsUntilNextWeeklyReset(now = new Date()): number {
  const weekday = getJstWeekdayMondayZero(now);
  const daysUntilNextMonday = weekday === 0 ? 7 : 7 - weekday;
  return getMsUntilNextGachaReset(now) + (daysUntilNextMonday - 1) * DAY_MS;
}

/** 次の月次リセット（毎月1日 0:00 JST）までのミリ秒 */
export function getMsUntilNextMonthlyReset(now = new Date()): number {
  const dayStr = getGachaDayJst(now);
  const [year, month, day] = dayStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysUntilNextFirst = daysInMonth - day + 1;
  return getMsUntilNextGachaReset(now) + (daysUntilNextFirst - 1) * DAY_MS;
}

export function getMsUntilNextBonusReset(type: BonusType, now = new Date()): number {
  switch (type) {
    case "daily":
      return getMsUntilNextGachaReset(now);
    case "weekly":
      return getMsUntilNextWeeklyReset(now);
    case "monthly":
      return getMsUntilNextMonthlyReset(now);
  }
}

export function formatBonusCooldown(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours > 0) {
      return `${days}日${remHours}時間`;
    }
    return `${days}日`;
  }
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  if (minutes > 0) {
    return `${minutes}分`;
  }
  return "まもなく";
}

export const BONUS_TYPE_LABELS: Record<BonusType, { title: string; titleEn: string; resetLabel: string }> = {
  daily: {
    title: "デイリーボーナス",
    titleEn: "Daily Bonus",
    resetLabel: "毎日 0:00（日本時間）に更新",
  },
  weekly: {
    title: "ウィークリーボーナス",
    titleEn: "Weekly Bonus",
    resetLabel: "毎週月曜 0:00（日本時間）に更新",
  },
  monthly: {
    title: "マンスリーボーナス",
    titleEn: "Monthly Bonus",
    resetLabel: "毎月1日 0:00（日本時間）に更新",
  },
};

export function isBonusType(value: string): value is BonusType {
  return value === "daily" || value === "weekly" || value === "monthly";
}
