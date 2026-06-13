import type { GachaCollectionEntry } from "@/lib/gacha-collection";

function parseTime(iso: string): number {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** 端末間マイグレーション用: 同一 cast の枚数を合算（取りこぼし復旧） */
export function sumMergeGachaCollectionEntries(
  ...groups: GachaCollectionEntry[][]
): GachaCollectionEntry[] {
  const map = new Map<string, GachaCollectionEntry>();

  for (const group of groups) {
    for (const entry of group) {
      if (!entry?.castId || entry.count < 1) continue;
      const existing = map.get(entry.castId);
      if (!existing) {
        map.set(entry.castId, { ...entry, gender: entry.gender === "male" ? "male" : "female" });
        continue;
      }

      const useIncoming = parseTime(entry.lastObtainedAt) >= parseTime(existing.lastObtainedAt);
      map.set(entry.castId, {
        castId: entry.castId,
        count: existing.count + entry.count,
        name: useIncoming ? entry.name : existing.name,
        nameEn: useIncoming ? entry.nameEn : existing.nameEn,
        image: useIncoming ? entry.image : existing.image,
        gender: useIncoming
          ? entry.gender === "male"
            ? "male"
            : "female"
          : existing.gender,
        firstObtainedAt:
          parseTime(entry.firstObtainedAt) < parseTime(existing.firstObtainedAt)
            ? entry.firstObtainedAt
            : existing.firstObtainedAt,
        lastObtainedAt:
          parseTime(entry.lastObtainedAt) > parseTime(existing.lastObtainedAt)
            ? entry.lastObtainedAt
            : existing.lastObtainedAt,
      });
    }
  }

  return [...map.values()]
    .filter((entry) => entry.count > 0)
    .sort((a, b) => parseTime(b.lastObtainedAt) - parseTime(a.lastObtainedAt));
}

export function normalizeGachaCollectionEntries(parsed: unknown): GachaCollectionEntry[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (entry): entry is GachaCollectionEntry =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            typeof (entry as GachaCollectionEntry).castId === "string" &&
            typeof (entry as GachaCollectionEntry).name === "string" &&
            typeof (entry as GachaCollectionEntry).count === "number" &&
            (entry as GachaCollectionEntry).count > 0
        )
    )
    .map(
      (entry): GachaCollectionEntry => ({
        ...entry,
        gender: entry.gender === "male" ? "male" : "female",
      })
    )
    .sort((a, b) => parseTime(b.lastObtainedAt) - parseTime(a.lastObtainedAt));
}
