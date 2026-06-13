import type { GachaDrawHistoryRecord } from "@/lib/gacha-history";
import { GACHA_HISTORY_UPDATED_EVENT } from "@/lib/gacha-history";
import {
  buildUserRequestHeadersForApi,
  ensureUserApiSession,
  isRemoteCollectionUserKey,
} from "@/lib/gacha-collection-client";

export async function fetchGachaDrawHistoryRemote(
  userKey: string | null
): Promise<GachaDrawHistoryRecord[]> {
  if (!userKey || !isRemoteCollectionUserKey(userKey)) return [];

  const response = await fetch("/api/user/gacha-history", {
    headers: await buildUserRequestHeadersForApi(),
    cache: "no-store",
  });

  if (response.status === 401) return [];
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "ガチャ履歴の取得に失敗しました");
  }

  const body = (await response.json()) as { records: GachaDrawHistoryRecord[] };
  return body.records ?? [];
}

export function cacheGachaDrawHistoryLocal(
  historyKey: string,
  records: GachaDrawHistoryRecord[]
): void {
  if (typeof window === "undefined" || !historyKey) return;
  window.localStorage.setItem(historyKey, JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(GACHA_HISTORY_UPDATED_EVENT, { detail: { historyKey } })
  );
}

export async function syncGachaDrawHistoryFromServer(
  userKey: string | null,
  historyKey: string | null
): Promise<GachaDrawHistoryRecord[]> {
  if (!userKey || !historyKey || !isRemoteCollectionUserKey(userKey)) {
    return [];
  }

  const hasSession = await ensureUserApiSession();
  if (!hasSession) return [];

  const records = await fetchGachaDrawHistoryRemote(userKey);
  cacheGachaDrawHistoryLocal(historyKey, records);
  return records;
}
