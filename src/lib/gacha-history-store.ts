import "server-only";

import {
  GACHA_RARITIES,
  getPrizeByRarity,
  type GachaCastSnapshot,
  type GachaDrawResult,
  type GachaRarity,
} from "@/lib/gacha";
import { USER_HISTORY_MAX_ENTRIES } from "@/lib/history-limits";
import type { GachaDrawHistoryRecord } from "@/lib/gacha-history";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_gacha_collections|user_gacha_draw_history|user_gacha_exchange_history/.test(error.message ?? "")
  );
}

export function isGachaHistoryStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
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

function parseHistoryRecords(rows: { record_id: string; result: unknown; won_at: string }[]): GachaDrawHistoryRecord[] {
  return rows
    .map((row) => {
      const result = normalizeDrawResult(row.result);
      if (!result) return null;
      return { id: row.record_id, result };
    })
    .filter((record): record is GachaDrawHistoryRecord => record !== null)
    .sort((a, b) => new Date(b.result.wonAt).getTime() - new Date(a.result.wonAt).getTime())
    .slice(0, USER_HISTORY_MAX_ENTRIES);
}

export async function getGachaDrawHistoryRemote(userKey: string): Promise<GachaDrawHistoryRecord[]> {
  if (!isGachaHistoryStoreEnabled()) return [];

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("user_gacha_draw_history")
    .select("record_id, result, won_at")
    .eq("user_key", userKey)
    .order("won_at", { ascending: false })
    .limit(USER_HISTORY_MAX_ENTRIES);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
  if (isMissingTableError(error) || !data) return [];

  return parseHistoryRecords(data);
}

export async function appendGachaDrawHistoryRemote(
  userKey: string,
  draws: GachaDrawResult[]
): Promise<GachaDrawHistoryRecord[]> {
  if (!isGachaHistoryStoreEnabled() || draws.length === 0) {
    return getGachaDrawHistoryRemote(userKey);
  }

  const supabase = getSupabaseAdmin()!;
  const rows = draws.map((draw, index) => ({
    user_key: userKey,
    record_id: `draw-${Date.now()}-${index}`,
    result: draw,
    won_at: draw.wonAt,
  }));

  const { error: insertError } = await supabase.from("user_gacha_draw_history").insert(rows);
  if (insertError) {
    if (isMissingTableError(insertError)) {
      throw new Error(
        "ガチャ履歴テーブルが未作成です。scripts/supabase-gacha-collection.sql を実行してください。"
      );
    }
    throw new Error(insertError.message);
  }

  const records = await getGachaDrawHistoryRemote(userKey);
  const overflow = await supabase
    .from("user_gacha_draw_history")
    .select("record_id")
    .eq("user_key", userKey)
    .order("won_at", { ascending: false });

  if (overflow.error) {
    return records;
  }

  const keepIds = new Set(records.map((record) => record.id));
  const deleteIds = (overflow.data ?? [])
    .map((row) => row.record_id)
    .filter((id) => !keepIds.has(id));

  if (deleteIds.length > 0) {
    await supabase
      .from("user_gacha_draw_history")
      .delete()
      .eq("user_key", userKey)
      .in("record_id", deleteIds);
  }

  return records;
}

export async function updateGachaDrawHistorySerialStatusRemote(
  userKey: string,
  serialNumber: string,
  serialStatus: import("@/lib/gacha-serial").GachaSerialStatus
): Promise<void> {
  if (!isGachaHistoryStoreEnabled()) return;

  const normalized = serialNumber.trim();
  if (!normalized) return;

  const records = await getGachaDrawHistoryRemote(userKey);
  const target = records.find((record) => record.result.serialNumber?.trim() === normalized);
  if (!target) return;

  const supabase = getSupabaseAdmin()!;
  const nextResult = { ...target.result, serialStatus };
  await supabase
    .from("user_gacha_draw_history")
    .update({ result: nextResult })
    .eq("user_key", userKey)
    .eq("record_id", target.id);
}
