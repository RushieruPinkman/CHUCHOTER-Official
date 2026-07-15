"use client";

import { useNavBadges } from "@/components/NavBadgesProvider";
import type { DmUnreadSummary } from "@/lib/dm";

/**
 * Header DM unread badge — sourced from the shared NavBadgesProvider poll.
 * Multiple nav mounts (desktop + mobile) read the same context; no duplicate fetches.
 */
export function useDmUnreadSummary(): DmUnreadSummary & { ready: boolean } {
  const { dm, ready } = useNavBadges();
  return { ...dm, ready };
}
