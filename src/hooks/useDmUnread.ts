"use client";

import { useCallback, useEffect, useState } from "react";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { isUserAuthEnabled } from "@/lib/supabase/config";
import { DM_UPDATED_EVENT, fetchDmUnreadSummary } from "@/lib/dm-client";
import type { DmUnreadSummary } from "@/lib/dm";

const EMPTY_SUMMARY: DmUnreadSummary = { unreadCount: 0, hasThread: false };

export function useDmUnreadSummary(): DmUnreadSummary & { ready: boolean } {
  const { userKey, ready: authReady } = useCollectionUserKey();
  const devMode = isAuthDevEnabled() && !isUserAuthEnabled();
  const [summary, setSummary] = useState<DmUnreadSummary>(EMPTY_SUMMARY);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    if (!userKey) {
      setSummary(EMPTY_SUMMARY);
      setReady(true);
      return;
    }

    const next = await fetchDmUnreadSummary(userKey, devMode);
    setSummary(next);
    setReady(true);
  }, [authReady, devMode, userKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(DM_UPDATED_EVENT, onUpdated);
    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => {
      window.removeEventListener(DM_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { ...summary, ready };
}
