import { isGachaMiss, type GachaCastSnapshot, type GachaDrawResult } from "@/lib/gacha";
import type { Cast } from "@/types";

export const GACHA_COLLECTION_UPDATED_EVENT = "chuchoter-gacha-collection-updated";

export type CollectionGender = Cast["gender"];

export interface GachaCollectionEntry {
  castId: string;
  name: string;
  nameEn: string;
  image: string;
  gender: CollectionGender;
  count: number;
  firstObtainedAt: string;
  lastObtainedAt: string;
}

export function buildDevCollectionUserKey(email: string): string {
  return `dev:${email.trim().toLowerCase()}`;
}

export function buildAuthCollectionUserKey(userId: string): string {
  return `auth:${userId}`;
}

function getStorageKey(userKey: string): string {
  return `chuchoter-gacha-collection:${userKey}`;
}

export function readGachaCollection(userKey: string): GachaCollectionEntry[] {
  if (typeof window === "undefined" || !userKey) return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(userKey));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as GachaCollectionEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.castId === "string" &&
          typeof entry.name === "string" &&
          typeof entry.count === "number" &&
          entry.count > 0
      )
      .map(
        (entry): GachaCollectionEntry => ({
          ...entry,
          gender: entry.gender === "male" ? "male" : "female",
        })
      )
      .sort(
        (a, b) =>
          new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
      );
  } catch {
    return [];
  }
}

function writeGachaCollection(userKey: string, entries: GachaCollectionEntry[]): void {
  window.localStorage.setItem(getStorageKey(userKey), JSON.stringify(entries));
  window.dispatchEvent(
    new CustomEvent(GACHA_COLLECTION_UPDATED_EVENT, { detail: { userKey } })
  );

  if (userKey.startsWith("auth:")) {
    void import("@/lib/gacha-collection-client").then(({ saveGachaCollectionRemoteClient }) =>
      saveGachaCollectionRemoteClient(userKey, entries).catch(() => {
        /* 次回表示時に再同期 */
      })
    );
  }
}

/** 指定キャストを指定枚数消費。不足があれば null */
export function consumeCollectionCastAmount(
  userKey: string,
  castId: string,
  amount: number
): GachaCollectionEntry[] | null {
  if (!userKey || amount < 1) return null;

  const entries = readGachaCollection(userKey);
  const entry = entries.find((item) => item.castId === castId);
  if (!entry || entry.count < amount) return null;

  entry.count -= amount;

  const nextEntries = entries
    .filter((item) => item.count > 0)
    .sort(
      (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
    );

  writeGachaCollection(userKey, nextEntries);
  return nextEntries;
}

/** 指定キャストを1枚ずつ消費。不足があれば null */
export function consumeCollectionCasts(
  userKey: string,
  castIds: string[]
): GachaCollectionEntry[] | null {
  if (!userKey || castIds.length === 0) return null;

  const entries = readGachaCollection(userKey);

  for (const castId of castIds) {
    const entry = entries.find((item) => item.castId === castId);
    if (!entry || entry.count < 1) return null;
  }

  for (const castId of castIds) {
    const entry = entries.find((item) => item.castId === castId)!;
    entry.count -= 1;
  }

  const nextEntries = entries
    .filter((entry) => entry.count > 0)
    .sort(
      (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
    );

  writeGachaCollection(userKey, nextEntries);
  return nextEntries;
}

export function addGachaCollectionCast(
  userKey: string,
  cast: GachaCastSnapshot
): GachaCollectionEntry[] {
  if (!userKey || !cast.id) return readGachaCollection(userKey);

  const entries = readGachaCollection(userKey);
  const now = new Date().toISOString();
  const gender: CollectionGender = cast.gender ?? "female";
  const existing = entries.find((entry) => entry.castId === cast.id);

  if (existing) {
    existing.count += 1;
    existing.lastObtainedAt = now;
    existing.name = cast.name;
    existing.nameEn = cast.nameEn;
    existing.image = cast.image;
    existing.gender = gender;
  } else {
    entries.push({
      castId: cast.id,
      name: cast.name,
      nameEn: cast.nameEn,
      image: cast.image,
      gender,
      count: 1,
      firstObtainedAt: now,
      lastObtainedAt: now,
    });
  }

  entries.sort(
    (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
  );

  writeGachaCollection(userKey, entries);
  return readGachaCollection(userKey);
}

/** 開発・テスト用: 指定キャストの所持枚数を一括加算 */
export function incrementGachaCollectionCasts(
  userKey: string,
  catalog: CollectionCatalogCast[],
  amountPerCast: number
): GachaCollectionEntry[] {
  if (!userKey || amountPerCast < 1 || catalog.length === 0) {
    return readGachaCollection(userKey);
  }

  const entries = readGachaCollection(userKey);
  const now = new Date().toISOString();
  const map = new Map(entries.map((entry) => [entry.castId, { ...entry }]));

  for (const cast of catalog) {
    const existing = map.get(cast.id);
    if (existing) {
      existing.count += amountPerCast;
      existing.lastObtainedAt = now;
      existing.name = cast.name;
      existing.nameEn = cast.nameEn;
      existing.image = cast.image;
      existing.gender = cast.gender;
    } else {
      map.set(cast.id, {
        castId: cast.id,
        name: cast.name,
        nameEn: cast.nameEn,
        image: cast.image,
        gender: cast.gender,
        count: amountPerCast,
        firstObtainedAt: now,
        lastObtainedAt: now,
      });
    }
  }

  const nextEntries = [...map.values()].sort(
    (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
  );

  writeGachaCollection(userKey, nextEntries);
  return nextEntries;
}

/** ★1で住人が出たとき、ログイン中ユーザーのコレクションへ追加 */
export function registerGachaCollectionFromDraw(
  userKey: string | null,
  draw: GachaDrawResult
): void {
  if (!userKey || !isGachaMiss(draw.rarity) || !draw.cast) return;
  addGachaCollectionCast(userKey, draw.cast);
}

export function getGachaCollectionTotal(entries: GachaCollectionEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

export interface CollectionCatalogCast {
  id: string;
  name: string;
  nameEn: string;
  image: string;
  gender: CollectionGender;
}

export type CollectionSortMode = "owned-first" | "unowned-first";

export interface CollectionDisplayItem {
  castId: string;
  name: string;
  nameEn: string;
  image: string;
  gender: CollectionGender;
  count: number;
  owned: boolean;
}

export function buildCollectionDisplayItems(
  catalog: CollectionCatalogCast[],
  entries: GachaCollectionEntry[]
): CollectionDisplayItem[] {
  const map = new Map(entries.map((entry) => [entry.castId, entry]));

  return catalog.map((cast) => {
    const entry = map.get(cast.id);
    const count = entry?.count ?? 0;
    return {
      castId: cast.id,
      name: cast.name,
      nameEn: cast.nameEn,
      image: cast.image,
      gender: cast.gender,
      count,
      owned: count > 0,
    };
  });
}

export function sortCollectionDisplayItems(
  items: CollectionDisplayItem[],
  mode: CollectionSortMode
): CollectionDisplayItem[] {
  return [...items].sort((a, b) => {
    if (a.owned !== b.owned) {
      if (mode === "owned-first") return a.owned ? -1 : 1;
      return a.owned ? 1 : -1;
    }
    return a.name.localeCompare(b.name, "ja");
  });
}

export function groupCollectionDisplayByGender(items: CollectionDisplayItem[]): {
  female: CollectionDisplayItem[];
  male: CollectionDisplayItem[];
} {
  const female: CollectionDisplayItem[] = [];
  const male: CollectionDisplayItem[] = [];

  for (const item of items) {
    if (item.gender === "male") {
      male.push(item);
    } else {
      female.push(item);
    }
  }

  return { female, male };
}

export function groupGachaCollectionByGender(entries: GachaCollectionEntry[]): {
  female: GachaCollectionEntry[];
  male: GachaCollectionEntry[];
} {
  const female: GachaCollectionEntry[] = [];
  const male: GachaCollectionEntry[] = [];

  for (const entry of entries) {
    if (entry.gender === "male") {
      male.push(entry);
    } else {
      female.push(entry);
    }
  }

  return { female, male };
}
