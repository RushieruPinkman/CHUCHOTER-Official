import type { GachaCollectionEntry } from "@/lib/gacha-collection";
import {
  normalizeGachaCollectionEntries,
  sumMergeGachaCollectionEntries,
} from "@/lib/gacha-collection-merge";
import { readDevSession } from "@/lib/auth-dev";
import { buildDevCollectionUserKey } from "@/lib/gacha-collection";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";
import {
  readGachaCollection,
  GACHA_COLLECTION_UPDATED_EVENT,
} from "@/lib/gacha-collection";

const MIGRATION_FLAG_PREFIX = "chuchoter-gacha-collection-synced:";

async function buildUserRequestHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const devSession = readDevSession();
  if (devSession?.email) {
    headers["X-Dev-User-Key"] = buildDevCollectionUserKey(devSession.email);
    return headers;
  }

  if (isUserAuthEnabled()) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      /* ignore */
    }
  }

  return headers;
}

function writeLocalCollection(userKey: string, entries: GachaCollectionEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`chuchoter-gacha-collection:${userKey}`, JSON.stringify(entries));
  window.dispatchEvent(
    new CustomEvent(GACHA_COLLECTION_UPDATED_EVENT, { detail: { userKey } })
  );
}

export function isRemoteCollectionUserKey(userKey: string | null): boolean {
  return Boolean(userKey?.startsWith("auth:"));
}

export async function saveGachaCollectionRemoteClient(
  userKey: string,
  entries: GachaCollectionEntry[]
): Promise<void> {
  if (!isRemoteCollectionUserKey(userKey)) return;

  const response = await fetch("/api/user/collection", {
    method: "PUT",
    headers: await buildUserRequestHeaders(),
    body: JSON.stringify({ entries }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "コレクションの保存に失敗しました");
  }
}

export async function syncGachaCollectionFromServer(userKey: string): Promise<GachaCollectionEntry[]> {
  if (!isRemoteCollectionUserKey(userKey)) {
    return readGachaCollection(userKey);
  }

  const local = readGachaCollection(userKey);
  const response = await fetch("/api/user/collection", {
    headers: await buildUserRequestHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) return local;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "コレクションの取得に失敗しました");
  }

  const body = (await response.json()) as { entries: GachaCollectionEntry[] };
  const serverEntries = normalizeGachaCollectionEntries(body.entries);
  const migrationKey = `${MIGRATION_FLAG_PREFIX}${userKey}`;
  const migratedOnDevice = window.localStorage.getItem(migrationKey) === "1";
  let merged = serverEntries;

  if (!migratedOnDevice && local.length > 0) {
    if (serverEntries.length === 0) {
      merged = local;
    } else {
      merged = sumMergeGachaCollectionEntries(serverEntries, local);
    }
    await saveGachaCollectionRemoteClient(userKey, merged);
    window.localStorage.setItem(migrationKey, "1");
  } else if (serverEntries.length > 0) {
    merged = serverEntries;
  }

  writeLocalCollection(userKey, merged);
  return merged;
}

export async function buildUserRequestHeadersForApi(): Promise<HeadersInit> {
  return buildUserRequestHeaders();
}
