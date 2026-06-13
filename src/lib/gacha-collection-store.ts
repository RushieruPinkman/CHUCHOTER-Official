import "server-only";

import { isGachaMiss, type GachaCastSnapshot, type GachaDrawResult } from "@/lib/gacha";
import type { GachaCollectionEntry } from "@/lib/gacha-collection";
import {
  normalizeGachaCollectionEntries,
  sumMergeGachaCollectionEntries,
} from "@/lib/gacha-collection-merge";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_gacha_collections|user_gacha_draw_history/.test(error.message ?? "")
  );
}

export function isGachaCollectionStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

export async function getGachaCollectionRemote(userKey: string): Promise<GachaCollectionEntry[]> {
  if (!isGachaCollectionStoreEnabled()) return [];

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("user_gacha_collections")
    .select("entries")
    .eq("user_key", userKey)
    .maybeSingle();

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
  if (isMissingTableError(error) || !data) return [];

  return normalizeGachaCollectionEntries(data.entries);
}

export async function saveGachaCollectionRemote(
  userKey: string,
  entries: GachaCollectionEntry[]
): Promise<GachaCollectionEntry[]> {
  if (!isGachaCollectionStoreEnabled()) {
    throw new Error(
      "コレクション保存機能が未設定です。scripts/supabase-gacha-collection.sql を Supabase で実行してください。"
    );
  }

  const normalized = normalizeGachaCollectionEntries(entries);
  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from("user_gacha_collections").upsert(
    {
      user_key: userKey,
      entries: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_key" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "コレクションテーブルが未作成です。scripts/supabase-gacha-collection.sql を実行してください。"
      );
    }
    throw new Error(error.message);
  }

  return normalized;
}

export async function mergeAndSaveGachaCollectionRemote(
  userKey: string,
  incoming: GachaCollectionEntry[]
): Promise<GachaCollectionEntry[]> {
  const current = await getGachaCollectionRemote(userKey);
  const merged = sumMergeGachaCollectionEntries(current, incoming);
  return saveGachaCollectionRemote(userKey, merged);
}

export async function addGachaCollectionCastRemote(
  userKey: string,
  cast: GachaCastSnapshot
): Promise<GachaCollectionEntry[]> {
  if (!cast.id) return getGachaCollectionRemote(userKey);

  const entries = await getGachaCollectionRemote(userKey);
  const now = new Date().toISOString();
  const gender = cast.gender ?? "female";
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

  return saveGachaCollectionRemote(userKey, entries);
}

export async function registerGachaCollectionFromDrawsRemote(
  userKey: string,
  draws: GachaDrawResult[]
): Promise<GachaCollectionEntry[]> {
  const entries = await getGachaCollectionRemote(userKey);

  for (const draw of draws) {
    if (!isGachaMiss(draw.rarity) || !draw.cast) continue;
    const now = draw.wonAt || new Date().toISOString();
    const cast = draw.cast;
    const gender = cast.gender ?? "female";
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
  }

  entries.sort(
    (a, b) => new Date(b.lastObtainedAt).getTime() - new Date(a.lastObtainedAt).getTime()
  );

  return saveGachaCollectionRemote(userKey, entries);
}
