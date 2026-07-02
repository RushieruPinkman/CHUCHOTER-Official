import "server-only";

import {
  getBonusPeriodKey,
  getMsUntilNextBonusReset,
  isBonusType,
  type BonusType,
} from "@/lib/bonus-period";
import { BONUS_ROULETTE_PRIZES, pickBonusRoulettePrize } from "@/lib/bonus-roulette";
import { grantCp, getCpState, isCpStoreEnabled } from "@/lib/cp-store";
import { isSupabaseConnectionError } from "@/lib/supabase-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type BonusClaimStatus = "available" | "pending" | "collected";

export interface BonusRouletteEntry {
  type: BonusType;
  status: BonusClaimStatus;
  periodKey: string;
  cpAmount: number | null;
  prizeIndex: number | null;
  prizes: typeof BONUS_ROULETTE_PRIZES[BonusType];
  nextResetMs: number;
}

export interface BonusRouletteState {
  enabled: boolean;
  entries: BonusRouletteEntry[];
}

interface BonusClaimRow {
  bonus_type: string;
  period_key: string;
  cp_amount: number;
  prize_index: number;
  spun_at: string;
  collected_at: string | null;
}

const BONUS_TYPES: BonusType[] = ["daily", "weekly", "monthly"];

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /user_bonus_roulette_claims/.test(error.message ?? "");
}

function buildEntry(
  type: BonusType,
  row: BonusClaimRow | null,
  now = new Date()
): BonusRouletteEntry {
  const periodKey = getBonusPeriodKey(type, now);

  if (!row || row.period_key !== periodKey) {
    return {
      type,
      status: "available",
      periodKey,
      cpAmount: null,
      prizeIndex: null,
      prizes: BONUS_ROULETTE_PRIZES[type],
      nextResetMs: getMsUntilNextBonusReset(type, now),
    };
  }

  if (row.collected_at) {
    return {
      type,
      status: "collected",
      periodKey,
      cpAmount: row.cp_amount,
      prizeIndex: row.prize_index,
      prizes: BONUS_ROULETTE_PRIZES[type],
      nextResetMs: getMsUntilNextBonusReset(type, now),
    };
  }

  return {
    type,
    status: "pending",
    periodKey,
    cpAmount: row.cp_amount,
    prizeIndex: row.prize_index,
    prizes: BONUS_ROULETTE_PRIZES[type],
    nextResetMs: getMsUntilNextBonusReset(type, now),
  };
}

export async function getBonusRouletteState(userKey: string): Promise<BonusRouletteState> {
  if (!isCpStoreEnabled()) {
    return { enabled: false, entries: [] };
  }

  try {
    const supabase = getSupabaseAdmin()!;
    const now = new Date();
    const periodKeys = BONUS_TYPES.map((type) => getBonusPeriodKey(type, now));

    const { data, error } = await supabase
      .from("user_bonus_roulette_claims")
      .select("bonus_type, period_key, cp_amount, prize_index, spun_at, collected_at")
      .eq("user_key", userKey)
      .in("bonus_type", BONUS_TYPES)
      .in("period_key", periodKeys);

    if (error && !isMissingTableError(error)) {
      if (isSupabaseConnectionError(error)) {
        return { enabled: false, entries: [] };
      }
      throw new Error(error.message);
    }
    if (isMissingTableError(error)) {
      return { enabled: false, entries: [] };
    }

    const rowByType = new Map<BonusType, BonusClaimRow>();
    for (const row of (data as BonusClaimRow[] | null) ?? []) {
      if (isBonusType(row.bonus_type)) {
        rowByType.set(row.bonus_type, row);
      }
    }

    return {
      enabled: true,
      entries: BONUS_TYPES.map((type) => buildEntry(type, rowByType.get(type) ?? null, now)),
    };
  } catch (error) {
    if (isSupabaseConnectionError(error)) {
      return { enabled: false, entries: [] };
    }
    throw error;
  }
}

export async function spinBonusRoulette(
  userKey: string,
  type: BonusType
): Promise<{
  entry: BonusRouletteEntry;
  alreadySpun: boolean;
}> {
  if (!isCpStoreEnabled()) {
    throw new Error("CP 機能が設定されていません。scripts/supabase-cp.sql を実行してください。");
  }

  const supabase = getSupabaseAdmin()!;
  const now = new Date();
  const periodKey = getBonusPeriodKey(type, now);

  const { data: existing, error: readError } = await supabase
    .from("user_bonus_roulette_claims")
    .select("bonus_type, period_key, cp_amount, prize_index, spun_at, collected_at")
    .eq("user_key", userKey)
    .eq("bonus_type", type)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (readError && !isMissingTableError(readError)) {
    throw new Error(readError.message);
  }
  if (isMissingTableError(readError)) {
    throw new Error(
      "ボーナステーブルが未作成です。scripts/supabase-bonus-roulette.sql を SQL Editor で実行してください。"
    );
  }

  if (existing) {
    return {
      entry: buildEntry(type, existing as BonusClaimRow, now),
      alreadySpun: true,
    };
  }

  const spin = pickBonusRoulettePrize(type);
  const { error: insertError } = await supabase.from("user_bonus_roulette_claims").insert({
    user_key: userKey,
    bonus_type: type,
    period_key: periodKey,
    cp_amount: spin.cp,
    prize_index: spin.prizeIndex,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("user_bonus_roulette_claims")
        .select("bonus_type, period_key, cp_amount, prize_index, spun_at, collected_at")
        .eq("user_key", userKey)
        .eq("bonus_type", type)
        .eq("period_key", periodKey)
        .maybeSingle();

      return {
        entry: buildEntry(type, (raced as BonusClaimRow | null) ?? null, now),
        alreadySpun: true,
      };
    }
    throw new Error(insertError.message);
  }

  const row: BonusClaimRow = {
    bonus_type: type,
    period_key: periodKey,
    cp_amount: spin.cp,
    prize_index: spin.prizeIndex,
    spun_at: now.toISOString(),
    collected_at: null,
  };

  return {
    entry: buildEntry(type, row, now),
    alreadySpun: false,
  };
}

export async function collectBonusRoulette(
  userKey: string,
  type: BonusType
): Promise<{ entry: BonusRouletteEntry; balance: number }> {
  if (!isCpStoreEnabled()) {
    throw new Error("CP 機能が設定されていません。scripts/supabase-cp.sql を実行してください。");
  }

  const supabase = getSupabaseAdmin()!;
  const now = new Date();
  const periodKey = getBonusPeriodKey(type, now);

  const { data: existing, error: readError } = await supabase
    .from("user_bonus_roulette_claims")
    .select("bonus_type, period_key, cp_amount, prize_index, spun_at, collected_at")
    .eq("user_key", userKey)
    .eq("bonus_type", type)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (readError && !isMissingTableError(readError)) {
    throw new Error(readError.message);
  }
  if (isMissingTableError(readError) || !existing) {
    throw new Error("先にルーレットを回してください。");
  }

  const row = existing as BonusClaimRow;

  if (row.collected_at) {
    const cpState = await getCpState(userKey);
    return {
      entry: buildEntry(type, row, now),
      balance: cpState.balance,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("user_bonus_roulette_claims")
    .update({ collected_at: now.toISOString() })
    .eq("user_key", userKey)
    .eq("bonus_type", type)
    .eq("period_key", periodKey)
    .is("collected_at", null)
    .select("bonus_type, period_key, cp_amount, prize_index, spun_at, collected_at")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updated) {
    const cpState = await getCpState(userKey);
    return {
      entry: buildEntry(type, { ...row, collected_at: row.collected_at ?? now.toISOString() }, now),
      balance: cpState.balance,
    };
  }

  const updatedRow = updated as BonusClaimRow;
  const balance = await grantCp(userKey, updatedRow.cp_amount, `bonus_roulette:${type}`, periodKey);

  return {
    entry: buildEntry(type, updatedRow, now),
    balance,
  };
}
