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

const TRIM_SELECT_BATCH_SIZE = 100;
const TRIM_DELETE_CHUNK_SIZE = 100;
/** 1リクエストあたりの overflow 削除上限（タイムアウト防止） */
const TRIM_MAX_BATCHES_PER_REQUEST = 50;

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

  const { count, error: countError } = await supabase
    .from("user_gacha_draw_history")
    .select("record_id", { count: "exact", head: true })
    .eq("user_key", userKey);

  if (!countError && count && count > USER_HISTORY_MAX_ENTRIES) {
    await trimGachaDrawHistoryOverflow(userKey);
  }

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

async function deleteGachaDrawHistoryIds(
  userKey: string,
  deleteIds: string[]
): Promise<void> {
  if (deleteIds.length === 0) return;

  const supabase = getSupabaseAdmin()!;
  for (let index = 0; index < deleteIds.length; index += TRIM_DELETE_CHUNK_SIZE) {
    const chunk = deleteIds.slice(index, index + TRIM_DELETE_CHUNK_SIZE);
    const { error } = await supabase
      .from("user_gacha_draw_history")
      .delete()
      .eq("user_key", userKey)
      .in("record_id", chunk);

    if (error && !isMissingTableError(error)) {
      throw new Error(error.message);
    }
  }
}

async function trimGachaDrawHistoryOverflowPaginated(userKey: string): Promise<void> {
  const supabase = getSupabaseAdmin()!;

  const { data: keepRows, error: keepError } = await supabase
    .from("user_gacha_draw_history")
    .select("record_id")
    .eq("user_key", userKey)
    .order("won_at", { ascending: false })
    .limit(USER_HISTORY_MAX_ENTRIES);

  if (keepError) {
    if (isMissingTableError(keepError)) return;
    throw new Error(keepError.message);
  }

  const keepIds = new Set((keepRows ?? []).map((row) => row.record_id));
  if (keepIds.size === 0) return;

  let offset = USER_HISTORY_MAX_ENTRIES;

  for (let batchIndex = 0; batchIndex < TRIM_MAX_BATCHES_PER_REQUEST; batchIndex += 1) {
    const { data: batch, error } = await supabase
      .from("user_gacha_draw_history")
      .select("record_id")
      .eq("user_key", userKey)
      .order("won_at", { ascending: false })
      .range(offset, offset + TRIM_SELECT_BATCH_SIZE - 1);

    if (error) {
      if (isMissingTableError(error)) return;
      throw new Error(error.message);
    }
    if (!batch?.length) break;

    const deleteIds = batch.map((row) => row.record_id).filter((id) => !keepIds.has(id));
    await deleteGachaDrawHistoryIds(userKey, deleteIds);

    if (batch.length < TRIM_SELECT_BATCH_SIZE) break;
    offset += TRIM_SELECT_BATCH_SIZE;
  }
}

async function trimGachaDrawHistoryOverflow(userKey: string): Promise<void> {
  if (!isGachaHistoryStoreEnabled()) return;

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.rpc("trim_user_gacha_draw_history", {
    p_user_key: userKey,
    p_keep: USER_HISTORY_MAX_ENTRIES,
  });

  if (!error) return;

  const message = error.message ?? "";
  const rpcMissing =
    error.code === "42883" ||
    /trim_user_gacha_draw_history|Could not find the function/i.test(message);

  if (!rpcMissing && !isMissingTableError(error)) {
    throw new Error(message);
  }

  await trimGachaDrawHistoryOverflowPaginated(userKey);
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

  await trimGachaDrawHistoryOverflow(userKey);
  return getGachaDrawHistoryRemote(userKey);
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
