import { buildDmRequestHeaders } from "@/lib/dm-client";
import { shouldUseDevApiAuth } from "@/lib/auth-dev";
import type { DmUnreadSummary } from "@/lib/dm";

export interface NavBadges {
  dm: DmUnreadSummary;
  bonusUnclaimedCount: number;
}

export const EMPTY_NAV_BADGES: NavBadges = {
  dm: { unreadCount: 0, hasThread: false },
  bonusUnclaimedCount: 0,
};

/**
 * Single round-trip for header badge counts (DM unread + bonus unclaimed).
 * Replaces N independent `/api/dm?summary=1` + `/api/user/bonus` polls.
 */
export async function fetchNavBadges(userKey: string | null): Promise<NavBadges> {
  if (!userKey || shouldUseDevApiAuth(userKey)) {
    return EMPTY_NAV_BADGES;
  }

  try {
    const response = await fetch("/api/user/nav-badges", {
      headers: buildDmRequestHeaders(userKey),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return EMPTY_NAV_BADGES;
    }

    const body = (await response.json()) as {
      dmUnreadCount?: number;
      hasDmThread?: boolean;
      bonusUnclaimedCount?: number;
    };

    return {
      dm: {
        unreadCount: Number(body.dmUnreadCount) || 0,
        hasThread: Boolean(body.hasDmThread),
      },
      bonusUnclaimedCount: Math.max(0, Number(body.bonusUnclaimedCount) || 0),
    };
  } catch {
    return EMPTY_NAV_BADGES;
  }
}
