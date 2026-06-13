import type { CollectionExchangeRecord } from "@/lib/gacha-collection-exchange";
import { GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT } from "@/lib/gacha-collection-exchange";
import {
  buildUserRequestHeadersForApi,
  ensureUserApiSession,
  isRemoteCollectionUserKey,
} from "@/lib/gacha-collection-client";

const MIGRATION_FLAG_PREFIX = "chuchoter-gacha-exchange-synced:";

function readLocalExchangeHistory(userKey: string): CollectionExchangeRecord[] {
  if (typeof window === "undefined" || !userKey) return [];
  try {
    const raw = window.localStorage.getItem(`chuchoter-gacha-exchange-history:${userKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CollectionExchangeRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalExchangeHistory(userKey: string, records: CollectionExchangeRecord[]): void {
  if (typeof window === "undefined" || !userKey) return;
  window.localStorage.setItem(
    `chuchoter-gacha-exchange-history:${userKey}`,
    JSON.stringify(records)
  );
  window.dispatchEvent(
    new CustomEvent(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, { detail: { userKey } })
  );
}

function mergeExchangeHistories(
  serverRecords: CollectionExchangeRecord[],
  localRecords: CollectionExchangeRecord[]
): CollectionExchangeRecord[] {
  const map = new Map<string, CollectionExchangeRecord>();

  for (const record of [...serverRecords, ...localRecords]) {
    const existing = map.get(record.id);
    if (!existing) {
      map.set(record.id, record);
      continue;
    }
    const useIncoming =
      new Date(record.exchangedAt).getTime() >= new Date(existing.exchangedAt).getTime();
    map.set(record.id, useIncoming ? record : existing);
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime()
  );
}

export async function saveCollectionExchangeHistoryRemoteClient(
  userKey: string,
  records: CollectionExchangeRecord[]
): Promise<void> {
  if (!isRemoteCollectionUserKey(userKey)) return;

  const response = await fetch("/api/user/exchange-history", {
    method: "PUT",
    headers: await buildUserRequestHeadersForApi(),
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "交換履歴の保存に失敗しました");
  }
}

export async function syncCollectionExchangeHistoryFromServer(
  userKey: string
): Promise<CollectionExchangeRecord[]> {
  if (!isRemoteCollectionUserKey(userKey)) {
    return readLocalExchangeHistory(userKey);
  }

  const hasSession = await ensureUserApiSession();
  if (!hasSession) {
    return readLocalExchangeHistory(userKey);
  }

  const local = readLocalExchangeHistory(userKey);
  const response = await fetch("/api/user/exchange-history", {
    headers: await buildUserRequestHeadersForApi(),
    cache: "no-store",
  });

  if (response.status === 401) return local;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "交換履歴の取得に失敗しました");
  }

  const body = (await response.json()) as { records: CollectionExchangeRecord[] };
  const serverRecords = body.records ?? [];
  const migrationKey = `${MIGRATION_FLAG_PREFIX}${userKey}`;
  const migratedOnDevice = window.localStorage.getItem(migrationKey) === "1";
  let merged = serverRecords;

  if (!migratedOnDevice && local.length > 0) {
    if (serverRecords.length === 0) {
      merged = local;
    } else {
      merged = mergeExchangeHistories(serverRecords, local);
    }
    await saveCollectionExchangeHistoryRemoteClient(userKey, merged);
    window.localStorage.setItem(migrationKey, "1");
  } else if (serverRecords.length > 0) {
    merged = serverRecords;
  }

  writeLocalExchangeHistory(userKey, merged);
  return merged;
}
