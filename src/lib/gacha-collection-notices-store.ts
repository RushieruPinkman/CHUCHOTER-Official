import "server-only";

import type { CollectionRelocationNotice } from "@/lib/cast-collection-redistribution";
import { normalizeCollectionRelocationNotice } from "@/lib/cast-collection-redistribution";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_gacha_collection_notices|user_gacha_collections/.test(error.message ?? "")
  );
}

export function isGachaCollectionNoticesStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

export async function listGachaCollectionUserRows(): Promise<
  { user_key: string; entries: unknown }[]
> {
  if (!isGachaCollectionNoticesStoreEnabled()) return [];

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from("user_gacha_collections").select("user_key, entries");

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function appendCollectionRelocationNotice(
  userKey: string,
  notice: CollectionRelocationNotice
): Promise<void> {
  if (!isGachaCollectionNoticesStoreEnabled()) return;

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from("user_gacha_collection_notices").insert({
    user_key: userKey,
    notice_id: notice.id,
    notice,
    created_at: notice.createdAt,
  });

  if (error) {
    if (isMissingTableError(error)) return;
    throw new Error(error.message);
  }
}

export async function getPendingCollectionRelocationNotices(
  userKey: string
): Promise<CollectionRelocationNotice[]> {
  if (!isGachaCollectionNoticesStoreEnabled()) return [];

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("user_gacha_collection_notices")
    .select("notice")
    .eq("user_key", userKey)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeCollectionRelocationNotice(row.notice))
    .filter((notice): notice is CollectionRelocationNotice => Boolean(notice));
}

export async function dismissCollectionRelocationNotice(
  userKey: string,
  noticeId: string
): Promise<void> {
  if (!isGachaCollectionNoticesStoreEnabled()) return;

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase
    .from("user_gacha_collection_notices")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_key", userKey)
    .eq("notice_id", noticeId)
    .is("dismissed_at", null);

  if (error) {
    if (isMissingTableError(error)) return;
    throw new Error(error.message);
  }
}
