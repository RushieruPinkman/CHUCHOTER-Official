import type { GachaCollectionEntry } from "@/lib/gacha-collection";
import type { Cast } from "@/types";

export interface CollectionRelocationAllocation {
  castId: string;
  name: string;
  count: number;
}

export interface CollectionRelocationNotice {
  id: string;
  departedCastId: string;
  departedCastName: string;
  totalRedistributed: number;
  allocations: CollectionRelocationAllocation[];
  createdAt: string;
}

function pickRandomCast(targets: Cast[]): Cast {
  return targets[Math.floor(Math.random() * targets.length)]!;
}

function buildRelocationTargets(deletedGender: Cast["gender"], remainingCasts: Cast[]): Cast[] {
  const active = remainingCasts.filter((cast) => cast.active);
  const sameGender = active.filter((cast) => cast.gender === deletedGender);
  return sameGender.length > 0 ? sameGender : active;
}

export function redistributeDeletedCastInCollection(
  entries: GachaCollectionEntry[],
  deletedCast: Cast,
  remainingCasts: Cast[]
): { entries: GachaCollectionEntry[]; notice: CollectionRelocationNotice | null } {
  const orphan = entries.find((entry) => entry.castId === deletedCast.id);
  if (!orphan || orphan.count < 1) {
    return { entries, notice: null };
  }

  const cardCount = orphan.count;
  const gender = orphan.gender ?? deletedCast.gender;
  const targets = buildRelocationTargets(gender, remainingCasts);
  const noticeId = `reloc-${deletedCast.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  const withoutOrphan = entries
    .filter((entry) => entry.castId !== deletedCast.id)
    .map((entry) => ({ ...entry }));
  const map = new Map(withoutOrphan.map((entry) => [entry.castId, entry]));

  if (targets.length === 0) {
    const nextEntries = [...map.values()]
      .filter((entry) => entry.count > 0)
      .sort(
        (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
      );

    return {
      entries: nextEntries,
      notice: {
        id: noticeId,
        departedCastId: deletedCast.id,
        departedCastName: deletedCast.name,
        totalRedistributed: cardCount,
        allocations: [],
        createdAt,
      },
    };
  }

  const allocationMap = new Map<string, CollectionRelocationAllocation>();
  const now = createdAt;

  for (let index = 0; index < cardCount; index += 1) {
    const target = pickRandomCast(targets);
    const allocation = allocationMap.get(target.id);
    if (allocation) {
      allocation.count += 1;
    } else {
      allocationMap.set(target.id, {
        castId: target.id,
        name: target.name,
        count: 1,
      });
    }

    const entry = map.get(target.id);
    if (entry) {
      entry.count += 1;
      entry.lastObtainedAt = now;
      entry.name = target.name;
      entry.nameEn = target.nameEn;
      entry.image = target.image;
      entry.gender = target.gender;
    } else {
      map.set(target.id, {
        castId: target.id,
        name: target.name,
        nameEn: target.nameEn,
        image: target.image,
        gender: target.gender,
        count: 1,
        firstObtainedAt: now,
        lastObtainedAt: now,
      });
    }
  }

  const nextEntries = [...map.values()]
    .filter((entry) => entry.count > 0)
    .sort((a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime());

  const allocations = [...allocationMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ja")
  );

  return {
    entries: nextEntries,
    notice: {
      id: noticeId,
      departedCastId: deletedCast.id,
      departedCastName: deletedCast.name,
      totalRedistributed: cardCount,
      allocations,
      createdAt,
    },
  };
}

export function formatCollectionRelocationMessage(notice: CollectionRelocationNotice): string {
  const name = notice.departedCastName;

  if (notice.totalRedistributed < 1) {
    return `${name}さんはお引越ししました。`;
  }

  if (notice.allocations.length === 0) {
    return `${name}さんはお引越ししました。\nお持ちの${name}さんのカード${notice.totalRedistributed}枚は、振り分け先の住人がいないため取り下げられました。`;
  }

  const detail = notice.allocations.map((item) => `${item.name}さん×${item.count}枚`).join("、");
  return `${name}さんはお引越ししました。\nお持ちの${name}さんのカード${notice.totalRedistributed}枚は、${detail}のようにランダムに振り分けられました。`;
}

export function normalizeCollectionRelocationNotice(
  parsed: unknown
): CollectionRelocationNotice | null {
  if (!parsed || typeof parsed !== "object") return null;

  const value = parsed as CollectionRelocationNotice;
  if (
    typeof value.id !== "string" ||
    typeof value.departedCastId !== "string" ||
    typeof value.departedCastName !== "string" ||
    typeof value.totalRedistributed !== "number" ||
    typeof value.createdAt !== "string" ||
    !Array.isArray(value.allocations)
  ) {
    return null;
  }

  const allocations = value.allocations
    .filter(
      (item): item is CollectionRelocationAllocation =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.castId === "string" &&
            typeof item.name === "string" &&
            typeof item.count === "number" &&
            item.count > 0
        )
    )
    .map((item) => ({
      castId: item.castId,
      name: item.name,
      count: item.count,
    }));

  return {
    id: value.id,
    departedCastId: value.departedCastId,
    departedCastName: value.departedCastName,
    totalRedistributed: Math.max(0, Math.floor(value.totalRedistributed)),
    allocations,
    createdAt: value.createdAt,
  };
}
