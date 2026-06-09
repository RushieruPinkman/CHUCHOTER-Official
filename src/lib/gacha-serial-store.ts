import "server-only";

import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import {
  generateGachaSerialNumber,
  isValidGachaSerialNumber,
  normalizeGachaSerialNumber,
  type GachaSerialPublicRecord,
  type GachaSerialStatus,
} from "@/lib/gacha-serial";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type GachaSerialSource = "draw" | "exchange";

interface GachaSerialRow {
  serial: string;
  status: GachaSerialStatus;
  rarity: number;
  source: GachaSerialSource;
  won_at: string;
  user_key: string;
  prize_title: string;
  prize_subtitle: string | null;
  cast_name: string | null;
  used_at: string | null;
  created_at: string;
}

export interface IssueGachaSerialInput {
  rarity: number;
  source: GachaSerialSource;
  wonAt: string;
  userKey: string;
  prizeTitle: string;
  prizeSubtitle?: string | null;
  castName?: string | null;
}

function mapRow(row: GachaSerialRow): GachaSerialPublicRecord {
  return {
    serial: row.serial,
    status: row.status,
    rarity: row.rarity as GachaSerialPublicRecord["rarity"],
    source: row.source,
    wonAt: row.won_at,
    prizeTitle: row.prize_title,
    prizeSubtitle: row.prize_subtitle,
    castName: row.cast_name,
    usedAt: row.used_at,
  };
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /gacha_serials/.test(error.message ?? "");
}

export function isGachaSerialStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

export async function issueGachaSerial(input: IssueGachaSerialInput): Promise<GachaSerialPublicRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase が未設定のためシリアルを発行できません。");
  }

  if (input.rarity < 2 || input.rarity > 6) {
    throw new Error("シリアル発行対象のレアリティが不正です。");
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const serial = generateGachaSerialNumber();
    const { data, error } = await supabase
      .from("gacha_serials")
      .insert({
        serial,
        status: "issued",
        rarity: input.rarity,
        source: input.source,
        won_at: input.wonAt,
        user_key: input.userKey,
        prize_title: input.prizeTitle,
        prize_subtitle: input.prizeSubtitle ?? null,
        cast_name: input.castName ?? null,
      })
      .select("*")
      .single();

    if (!error && data) {
      return mapRow(data as GachaSerialRow);
    }

    if (error?.code === "23505") continue;

    if (isMissingTableError(error)) {
      throw new Error(
        "gacha_serials テーブルが未作成です。scripts/supabase-gacha-serials.sql を Supabase で実行してください。"
      );
    }

    throw new Error(error?.message || "シリアルの発行に失敗しました。");
  }

  throw new Error("シリアルの発行に失敗しました。再度お試しください。");
}

export async function getGachaSerial(serial: string): Promise<GachaSerialPublicRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = normalizeGachaSerialNumber(serial);
  if (!isValidGachaSerialNumber(normalized)) return null;

  const { data, error } = await supabase
    .from("gacha_serials")
    .select("*")
    .eq("serial", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }

  return data ? mapRow(data as GachaSerialRow) : null;
}

export async function getGachaSerials(serials: string[]): Promise<GachaSerialPublicRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const normalized = [...new Set(serials.map(normalizeGachaSerialNumber).filter(isValidGachaSerialNumber))];
  if (normalized.length === 0) return [];

  const { data, error } = await supabase.from("gacha_serials").select("*").in("serial", normalized);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data as GachaSerialRow[] | null)?.map(mapRow) ?? [];
}

export async function getGachaSerialsForUser(
  serials: string[],
  userKey: string
): Promise<GachaSerialPublicRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const normalized = [...new Set(serials.map(normalizeGachaSerialNumber).filter(isValidGachaSerialNumber))];
  if (normalized.length === 0) return [];

  const { data, error } = await supabase
    .from("gacha_serials")
    .select("*")
    .in("serial", normalized)
    .eq("user_key", userKey);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data as GachaSerialRow[] | null)?.map(mapRow) ?? [];
}

export async function markGachaSerialUsed(
  serial: string
): Promise<
  | { ok: true; record: GachaSerialPublicRecord; alreadyUsed: boolean }
  | { ok: false; error: string; notFound?: boolean }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Supabase が未設定です。" };
  }

  const normalized = normalizeGachaSerialNumber(serial);
  if (!isValidGachaSerialNumber(normalized)) {
    return { ok: false, error: "シリアルNo.の形式が正しくありません。" };
  }

  const existing = await getGachaSerial(normalized);
  if (!existing) {
    return { ok: false, error: "該当するシリアルNo.が見つかりません。", notFound: true };
  }

  if (existing.status === "used") {
    return { ok: true, record: existing, alreadyUsed: true };
  }

  const usedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("gacha_serials")
    .update({ status: "used", used_at: usedAt })
    .eq("serial", normalized)
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      return { ok: false, error: "gacha_serials テーブルが未作成です。" };
    }
    return { ok: false, error: error?.message || "使用済みへの更新に失敗しました。" };
  }

  return { ok: true, record: mapRow(data as GachaSerialRow), alreadyUsed: false };
}

export async function listRecentGachaSerials(limit = 20): Promise<GachaSerialPublicRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gacha_serials")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data as GachaSerialRow[] | null)?.map(mapRow) ?? [];
}

export function buildUserKeyFromAuthUserId(userId: string): string {
  return buildAuthCollectionUserKey(userId);
}
