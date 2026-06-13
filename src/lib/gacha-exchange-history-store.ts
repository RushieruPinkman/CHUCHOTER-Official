import "server-only";

import type { CollectionExchangeRecord } from "@/lib/gacha-collection-exchange";
import { USER_HISTORY_MAX_ENTRIES } from "@/lib/history-limits";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const EXCHANGE_HISTORY_MAX_ENTRIES = USER_HISTORY_MAX_ENTRIES;

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_gacha_collections|user_gacha_draw_history|user_gacha_exchange_history/.test(
      error.message ?? ""
    )
  );
}

export function isGachaExchangeHistoryStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

function normalizeExchangeRecord(value: unknown): CollectionExchangeRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as CollectionExchangeRecord;
  if (
    !record.id ||
    typeof record.exchangedAt !== "string" ||
    !(record.rarity === 1 || record.rarity === 4 || record.rarity === 5 || record.rarity === 6)
  ) {
    return null;
  }
  return record;
}

function parseExchangeHistoryRows(
  rows: { record_id: string; record: unknown; exchanged_at: string }[]
): CollectionExchangeRecord[] {
  return rows
    .map((row) => normalizeExchangeRecord(row.record))
    .filter((record): record is CollectionExchangeRecord => record !== null)
    .sort((a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime())
    .slice(0, EXCHANGE_HISTORY_MAX_ENTRIES);
}

export async function getCollectionExchangeHistoryRemote(
  userKey: string
): Promise<CollectionExchangeRecord[]> {
  if (!isGachaExchangeHistoryStoreEnabled()) return [];

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("user_gacha_exchange_history")
    .select("record_id, record, exchanged_at")
    .eq("user_key", userKey)
    .order("exchanged_at", { ascending: false })
    .limit(EXCHANGE_HISTORY_MAX_ENTRIES);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
  if (isMissingTableError(error) || !data) return [];

  return parseExchangeHistoryRows(data);
}

export async function saveCollectionExchangeHistoryRemote(
  userKey: string,
  records: CollectionExchangeRecord[]
): Promise<CollectionExchangeRecord[]> {
  if (!isGachaExchangeHistoryStoreEnabled()) {
    throw new Error(
      "交換履歴保存機能が未設定です。scripts/supabase-gacha-collection.sql を実行してください。"
    );
  }

  const normalized = records
    .filter((record) => normalizeExchangeRecord(record))
    .sort((a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime())
    .slice(0, EXCHANGE_HISTORY_MAX_ENTRIES);

  const supabase = getSupabaseAdmin()!;

  const { error: deleteError } = await supabase
    .from("user_gacha_exchange_history")
    .delete()
    .eq("user_key", userKey);

  if (deleteError && !isMissingTableError(deleteError)) {
    throw new Error(deleteError.message);
  }

  if (normalized.length === 0) {
    return [];
  }

  const rows = normalized.map((record) => ({
    user_key: userKey,
    record_id: record.id,
    record,
    exchanged_at: record.exchangedAt,
  }));

  const { error: insertError } = await supabase.from("user_gacha_exchange_history").insert(rows);
  if (insertError) {
    if (isMissingTableError(insertError)) {
      throw new Error(
        "交換履歴テーブルが未作成です。scripts/supabase-gacha-collection.sql を実行してください。"
      );
    }
    throw new Error(insertError.message);
  }

  return normalized;
}

export async function appendCollectionExchangeHistoryRemote(
  userKey: string,
  record: CollectionExchangeRecord
): Promise<CollectionExchangeRecord[]> {
  const current = await getCollectionExchangeHistoryRemote(userKey);
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(
    0,
    EXCHANGE_HISTORY_MAX_ENTRIES
  );
  return saveCollectionExchangeHistoryRemote(userKey, next);
}

export async function updateCollectionExchangeRecordRemote(
  userKey: string,
  recordId: string,
  patch: Partial<CollectionExchangeRecord>
): Promise<CollectionExchangeRecord | null> {
  const records = await getCollectionExchangeHistoryRemote(userKey);
  let updated: CollectionExchangeRecord | null = null;

  const next = records.map((record) => {
    if (record.id !== recordId) return record;
    updated = { ...record, ...patch };
    return updated;
  });

  if (!updated) return null;
  await saveCollectionExchangeHistoryRemote(userKey, next);
  return updated;
}
