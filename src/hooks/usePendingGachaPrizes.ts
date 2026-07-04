"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GachaDrawResult } from "@/lib/gacha";
import {
  ensureUserApiSession,
  isRemoteCollectionUserKey,
} from "@/lib/gacha-collection-client";
import {
  fetchPendingGachaPrizes,
  GACHA_SERIAL_STATUS_UPDATED_EVENT,
} from "@/lib/gacha-serial-client";

function pendingPrizesEqual(left: GachaDrawResult[], right: GachaDrawResult[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((prize, index) => {
    const other = right[index];
    return (
      prize.serialNumber === other.serialNumber &&
      prize.serialStatus === other.serialStatus &&
      prize.wonAt === other.wonAt &&
      prize.rarity === other.rarity
    );
  });
}

export function usePendingGachaPrizes(userKey: string | null, authReady = true) {
  const [prizes, setPrizes] = useState<GachaDrawResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!authReady || !userKey || !isRemoteCollectionUserKey(userKey)) {
      setPrizes([]);
      setHydrated(true);
      initialLoadDoneRef.current = true;
      return;
    }

    const isInitialLoad = !initialLoadDoneRef.current;
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const hasSession = await ensureUserApiSession();
      if (!hasSession) {
        setPrizes([]);
        return;
      }

      const next = await fetchPendingGachaPrizes();
      setPrizes((current) => (pendingPrizesEqual(current, next) ? current : next));
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      initialLoadDoneRef.current = true;
      setHydrated(true);
    }
  }, [authReady, userKey]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    setHydrated(false);
    setLoading(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
    };
  }, [refresh]);

  return { prizes, loading, hydrated, refresh };
}
