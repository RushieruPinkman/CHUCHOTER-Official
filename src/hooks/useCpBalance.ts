"use client";

import { useCallback, useEffect, useState } from "react";
import type { CpState } from "@/lib/cp";
import { CP_UPDATED_EVENT, fetchCpState } from "@/lib/cp-client";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";

export function useCpBalance() {
  const { userKey, ready: authReady } = useCollectionUserKey();
  const [state, setState] = useState<CpState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey) {
      setState(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const next = await fetchCpState();
      setState(next);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "CP の読み込みに失敗しました");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    void refresh();
  }, [authReady, refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };
    window.addEventListener(CP_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CP_UPDATED_EVENT, onUpdated);
  }, [refresh]);

  return {
    state,
    balance: state?.balance ?? 0,
    enabled: state?.enabled ?? false,
    loading: !authReady || loading,
    error,
    refresh,
  };
}
