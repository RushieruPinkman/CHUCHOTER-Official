"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildGachaHistoryKey } from "@/lib/gacha-history";
import {
  isRemoteCollectionUserKey,
  syncGachaCollectionFromServer,
  ensureUserApiSession,
} from "@/lib/gacha-collection-client";
import { syncGachaDrawHistoryFromServer } from "@/lib/gacha-history-client";
import { syncCollectionExchangeHistoryFromServer } from "@/lib/gacha-exchange-history-client";

interface UseGachaUserDataSyncOptions {
  /** 認証状態の解決完了後に true */
  authReady?: boolean;
  /** タブ復帰時に再同期する */
  resyncOnFocus?: boolean;
}

/**
 * ログインユーザーのコレクション・ガチャ履歴・交換履歴を Supabase と同期する。
 */
export function useGachaUserDataSync(
  userKey: string | null,
  { authReady = true, resyncOnFocus = true }: UseGachaUserDataSyncOptions = {}
) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const generationRef = useRef(0);

  const sync = useCallback(async () => {
    if (!authReady || !userKey || !isRemoteCollectionUserKey(userKey)) {
      setSynced(true);
      setSyncing(false);
      return;
    }

    const generation = ++generationRef.current;
    setSyncing(true);

    try {
      const hasSession = await ensureUserApiSession();
      if (!hasSession) return;

      const historyKey = buildGachaHistoryKey(userKey);
      await Promise.all([
        syncGachaCollectionFromServer(userKey),
        historyKey
          ? syncGachaDrawHistoryFromServer(userKey, historyKey)
          : Promise.resolve([]),
        syncCollectionExchangeHistoryFromServer(userKey),
      ]);

      if (generation === generationRef.current) {
        setSynced(true);
      }
    } catch {
      if (generation === generationRef.current) {
        setSynced(true);
      }
    } finally {
      if (generation === generationRef.current) {
        setSyncing(false);
      }
    }
  }, [authReady, userKey]);

  useEffect(() => {
    setSynced(false);
    void sync();
  }, [sync]);

  useEffect(() => {
    if (!resyncOnFocus || !authReady || !userKey || !isRemoteCollectionUserKey(userKey)) {
      return;
    }

    const onFocus = () => {
      void sync();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authReady, resyncOnFocus, sync, userKey]);

  return { syncing, synced, resync: sync };
}
