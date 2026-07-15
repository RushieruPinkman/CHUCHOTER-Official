"use client";

import { useNavBadges } from "@/components/NavBadgesProvider";

/**
 * Header bonus unclaimed badge — sourced from the shared NavBadgesProvider poll.
 */
export function useBonusUnclaimedCount(): { count: number; ready: boolean } {
  const { bonusUnclaimedCount, ready } = useNavBadges();
  return { count: bonusUnclaimedCount, ready };
}
