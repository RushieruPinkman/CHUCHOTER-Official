import {
  getPrizeByRarity,
  getRarityLabel,
  type GachaDrawResult,
  type GachaRarity,
} from "@/lib/gacha";
import {
  consumeCollectionCasts,
  readGachaCollection,
  type GachaCollectionEntry,
} from "@/lib/gacha-collection";
import { USER_HISTORY_MAX_ENTRIES } from "@/lib/history-limits";
import type { Cast } from "@/types";

const EXCHANGE_HISTORY_MAX_ENTRIES = USER_HISTORY_MAX_ENTRIES;

export const GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT =
  "chuchoter-gacha-collection-exchange-updated";

export type CollectionExchangeTier = "male_set" | "female_set" | "complete_set";

export interface ResidentCastRef {
  id: string;
  name: string;
  gender: Cast["gender"];
}

export interface CollectionExchangeConsumedCast {
  castId: string;
  name: string;
}

export interface CollectionExchangeRecord {
  id: string;
  tier: CollectionExchangeTier;
  rarity: 4 | 5 | 6;
  prizeTitle: string;
  prizeSubtitle: string;
  consumedCasts: CollectionExchangeConsumedCast[];
  exchangedAt: string;
  serialNumber?: string;
  /** 表示用。交換履歴から開く際は API 同期で上書き */
  serialStatus?: import("@/lib/gacha-serial").GachaSerialStatus;
}

export interface CollectionExchangeRule {
  tier: CollectionExchangeTier;
  rarity: 4 | 5 | 6;
  title: string;
  description: string;
  scopeLabel: string;
}

export const COLLECTION_EXCHANGE_RULES: CollectionExchangeRule[] = [
  {
    tier: "male_set",
    rarity: 4,
    title: "★4 交換",
    description: "登録されている男性住人をすべてコレクションで揃えると、各1枚ずつ消費して交換できます。",
    scopeLabel: "男性住人",
  },
  {
    tier: "female_set",
    rarity: 5,
    title: "★5 交換",
    description: "登録されている女性住人をすべてコレクションで揃えると、各1枚ずつ消費して交換できます。",
    scopeLabel: "女性住人",
  },
  {
    tier: "complete_set",
    rarity: 6,
    title: "★6 交換",
    description: "男女すべての住人をコレクションで揃えると、各1枚ずつ消費して交換できます。",
    scopeLabel: "全住人",
  },
];

export interface CollectionExchangeStatus {
  tier: CollectionExchangeTier;
  rarity: 4 | 5 | 6;
  title: string;
  description: string;
  scopeLabel: string;
  prizeTitle: string;
  prizeSubtitle: string;
  requiredCount: number;
  ownedCount: number;
  missingResidents: ResidentCastRef[];
  canExchange: boolean;
}

function getHistoryStorageKey(userKey: string): string {
  return `chuchoter-gacha-exchange-history:${userKey}`;
}

function getRequiredResidents(
  residents: ResidentCastRef[],
  tier: CollectionExchangeTier
): ResidentCastRef[] {
  if (tier === "male_set") {
    return residents.filter((resident) => resident.gender === "male");
  }
  if (tier === "female_set") {
    return residents.filter((resident) => resident.gender === "female");
  }
  return residents;
}

function buildCollectionMap(entries: GachaCollectionEntry[]): Map<string, GachaCollectionEntry> {
  return new Map(entries.map((entry) => [entry.castId, entry]));
}

export function evaluateCollectionExchangeStatus(
  entries: GachaCollectionEntry[],
  residents: ResidentCastRef[],
  tier: CollectionExchangeTier
): CollectionExchangeStatus {
  const rule = COLLECTION_EXCHANGE_RULES.find((item) => item.tier === tier)!;
  const prize = getPrizeByRarity(rule.rarity);
  const required = getRequiredResidents(residents, tier);
  const collectionMap = buildCollectionMap(entries);
  const missingResidents = required.filter((resident) => {
    const entry = collectionMap.get(resident.id);
    return !entry || entry.count < 1;
  });

  return {
    tier,
    rarity: rule.rarity,
    title: rule.title,
    description: rule.description,
    scopeLabel: rule.scopeLabel,
    prizeTitle: prize.title,
    prizeSubtitle: prize.subtitle,
    requiredCount: required.length,
    ownedCount: required.length - missingResidents.length,
    missingResidents,
    canExchange: required.length > 0 && missingResidents.length === 0,
  };
}

export function getAllCollectionExchangeStatuses(
  entries: GachaCollectionEntry[],
  residents: ResidentCastRef[]
): CollectionExchangeStatus[] {
  return COLLECTION_EXCHANGE_RULES.map((rule) =>
    evaluateCollectionExchangeStatus(entries, residents, rule.tier)
  );
}

export function readCollectionExchangeHistory(userKey: string): CollectionExchangeRecord[] {
  if (typeof window === "undefined" || !userKey) return [];

  try {
    const raw = window.localStorage.getItem(getHistoryStorageKey(userKey));
    if (!raw) return [];

    const records = parseCollectionExchangeHistoryRecords(JSON.parse(raw));
    const trimmed = trimExchangeHistoryRecords(records);

    if (trimmed.length !== records.length) {
      writeCollectionExchangeHistory(userKey, trimmed);
    }

    return trimmed;
  } catch {
    return [];
  }
}

function parseCollectionExchangeHistoryRecords(parsed: unknown): CollectionExchangeRecord[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (record) =>
        record &&
        typeof record.id === "string" &&
        typeof record.exchangedAt === "string" &&
        (record.rarity === 4 || record.rarity === 5 || record.rarity === 6)
    )
    .sort(
      (a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime()
    );
}

function trimExchangeHistoryRecords(
  records: CollectionExchangeRecord[]
): CollectionExchangeRecord[] {
  return records.slice(0, EXCHANGE_HISTORY_MAX_ENTRIES);
}

function writeCollectionExchangeHistory(
  userKey: string,
  records: CollectionExchangeRecord[]
): void {
  if (typeof window === "undefined" || !userKey) return;

  window.localStorage.setItem(getHistoryStorageKey(userKey), JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, { detail: { userKey } })
  );
}

export function clearCollectionExchangeHistory(userKey: string): void {
  if (typeof window === "undefined" || !userKey) return;
  writeCollectionExchangeHistory(userKey, []);
}

export type CollectionExchangeResult =
  | { ok: true; record: CollectionExchangeRecord }
  | { ok: false; error: string };

export function performCollectionExchange(
  userKey: string,
  residents: ResidentCastRef[],
  tier: CollectionExchangeTier
): CollectionExchangeResult {
  if (!userKey) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const entries = readGachaCollection(userKey);
  const status = evaluateCollectionExchangeStatus(entries, residents, tier);

  if (status.requiredCount === 0) {
    return { ok: false, error: "交換対象の住人が登録されていません。" };
  }

  if (!status.canExchange) {
    return { ok: false, error: "コレクションが揃っていません。" };
  }

  const required = getRequiredResidents(residents, tier);
  const castIds = required.map((resident) => resident.id);
  const consumed = consumeCollectionCasts(userKey, castIds);

  if (!consumed) {
    return { ok: false, error: "コレクションの消費に失敗しました。" };
  }

  const prize = getPrizeByRarity(status.rarity);
  const exchangedAt = new Date().toISOString();
  const record: CollectionExchangeRecord = {
    id: `exchange-${Date.now()}`,
    tier,
    rarity: status.rarity,
    prizeTitle: prize.title,
    prizeSubtitle: prize.subtitle,
    consumedCasts: required.map((resident) => ({
      castId: resident.id,
      name: resident.name,
    })),
    exchangedAt,
  };

  const history = readCollectionExchangeHistory(userKey);
  writeCollectionExchangeHistory(
    userKey,
    trimExchangeHistoryRecords([record, ...history])
  );

  return { ok: true, record };
}

export function updateCollectionExchangeRecordSerial(
  userKey: string,
  recordId: string,
  serialNumber: string
): CollectionExchangeRecord | null {
  if (typeof window === "undefined" || !userKey) return null;

  const history = readCollectionExchangeHistory(userKey);
  let updated: CollectionExchangeRecord | null = null;

  const nextHistory = history.map((record) => {
    if (record.id !== recordId) return record;
    updated = { ...record, serialNumber };
    return updated;
  });

  if (!updated) return null;

  writeCollectionExchangeHistory(userKey, nextHistory);
  return updated;
}

export function exchangeRecordToGachaDrawResult(
  record: CollectionExchangeRecord
): GachaDrawResult {
  return {
    rarity: record.rarity,
    prize: getPrizeByRarity(record.rarity),
    wonAt: record.exchangedAt,
    serialNumber: record.serialNumber,
    serialStatus: record.serialNumber ? "issued" : undefined,
  };
}

export function formatCollectionExchangeTimestamp(iso: string): string {
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

export function getExchangeTierRarityLabel(rarity: GachaRarity): string {
  return getRarityLabel(rarity);
}

export function toResidentCastRefs(
  casts: Pick<Cast, "id" | "name" | "gender">[]
): ResidentCastRef[] {
  return casts.map((cast) => ({
    id: cast.id,
    name: cast.name,
    gender: cast.gender ?? "female",
  }));
}
