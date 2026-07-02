import type { BonusRouletteState } from "@/lib/bonus-roulette-store";

export const BONUS_UPDATED_EVENT = "chuchoter-bonus-updated";

export function countUnclaimedBonuses(state: BonusRouletteState | null): number {
  if (!state?.enabled) return 0;
  return state.entries.filter((entry) => entry.status === "available" || entry.status === "pending")
    .length;
}

export function dispatchBonusUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BONUS_UPDATED_EVENT));
}
