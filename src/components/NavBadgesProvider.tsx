"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { BONUS_UPDATED_EVENT } from "@/lib/bonus-roulette-shared";
import { DM_UPDATED_EVENT } from "@/lib/dm-client";
import {
  EMPTY_NAV_BADGES,
  fetchNavBadges,
  type NavBadges,
} from "@/lib/nav-badges-client";
import { NAV_BADGES_POLL_MS, startVisibilityAwarePoll } from "@/lib/visibility-poll";
import type { DmUnreadSummary } from "@/lib/dm";

interface NavBadgesContextValue {
  dm: DmUnreadSummary;
  bonusUnclaimedCount: number;
  ready: boolean;
  refresh: () => Promise<void>;
}

const NavBadgesContext = createContext<NavBadgesContextValue | null>(null);

export function NavBadgesProvider({ children }: { children: ReactNode }) {
  const { userKey, ready: authReady } = useCollectionUserKey();
  const [badges, setBadges] = useState<NavBadges>(EMPTY_NAV_BADGES);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    if (!userKey) {
      setBadges(EMPTY_NAV_BADGES);
      setReady(true);
      return;
    }

    const next = await fetchNavBadges(userKey);
    setBadges(next);
    setReady(true);
  }, [authReady, userKey]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!authReady || !userKey) return;

    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(DM_UPDATED_EVENT, onUpdated);
    window.addEventListener(BONUS_UPDATED_EVENT, onUpdated);
    const stopPoll = startVisibilityAwarePoll(() => {
      void refresh();
    }, NAV_BADGES_POLL_MS);

    return () => {
      window.removeEventListener(DM_UPDATED_EVENT, onUpdated);
      window.removeEventListener(BONUS_UPDATED_EVENT, onUpdated);
      stopPoll();
    };
  }, [authReady, refresh, userKey]);

  const value = useMemo<NavBadgesContextValue>(
    () => ({
      dm: badges.dm,
      bonusUnclaimedCount: badges.bonusUnclaimedCount,
      ready,
      refresh,
    }),
    [badges.bonusUnclaimedCount, badges.dm, ready, refresh]
  );

  return <NavBadgesContext.Provider value={value}>{children}</NavBadgesContext.Provider>;
}

export function useNavBadges(): NavBadgesContextValue {
  const context = useContext(NavBadgesContext);
  if (!context) {
    throw new Error("useNavBadges must be used within NavBadgesProvider");
  }
  return context;
}
