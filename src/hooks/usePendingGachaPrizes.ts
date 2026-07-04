"use client";

import { useCallback, useEffect, useState } from "react";
import { GACHA_HISTORY_UPDATED_EVENT } from "@/lib/gacha-history";
import type { GachaDrawResult } from "@/lib/gacha";
import {
  ensureUserApiSession,
  isRemoteCollectionUserKey,
} from "@/lib/gacha-collection-client";
import {
  fetchPendingGachaPrizes,
  GACHA_SERIAL_STATUS_UPDATED_EVENT,
} from "@/lib/gacha-serial-client";

export function usePendingGachaPrizes(userKey: string | null, authReady = true) {
  const [prizes, setPrizes] = useState<GachaDrawResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady || !userKey || !isRemoteCollectionUserKey(userKey)) {
      setPrizes([]);
      setHydrated(true);
      return;
    }

    setLoading(true);
    try {
      const hasSession = await ensureUserApiSession();
      if (!hasSession) {
        setPrizes([]);
        return;
      }

      const next = await fetchPendingGachaPrizes();
      setPrizes(next);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [authReady, userKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
    window.addEventListener(GACHA_HISTORY_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
      window.removeEventListener(GACHA_HISTORY_UPDATED_EVENT, onUpdated);
    };
  }, [refresh]);

  return { prizes, loading, hydrated, refresh };
}
