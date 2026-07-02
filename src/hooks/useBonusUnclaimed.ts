"use client";

import { useCallback, useEffect, useState } from "react";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { BONUS_UPDATED_EVENT, countUnclaimedBonuses } from "@/lib/bonus-roulette-shared";
import { fetchBonusRouletteState } from "@/lib/bonus-roulette-client";

export function useBonusUnclaimedCount(): { count: number; ready: boolean } {
  const { userKey, ready: authReady } = useCollectionUserKey();
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    if (!userKey) {
      setCount(0);
      setReady(true);
      return;
    }

    try {
      const state = await fetchBonusRouletteState();
      setCount(countUnclaimedBonuses(state));
    } catch {
      setCount(0);
    } finally {
      setReady(true);
    }
  }, [authReady, userKey]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(BONUS_UPDATED_EVENT, onUpdated);
    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      window.removeEventListener(BONUS_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { count, ready };
}
