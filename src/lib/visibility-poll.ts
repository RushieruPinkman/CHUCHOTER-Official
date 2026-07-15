/**
 * Visibility-aware polling for client-side refresh loops.
 *
 * Backgrounded tabs pause timers. Returning to the tab triggers one tick
 * (debounced so visibilitychange + focus do not double-fire).
 */
export function startVisibilityAwarePoll(
  tick: () => void,
  intervalMs: number,
  options: { runOnFocus?: boolean; minGapMs?: number } = {}
): () => void {
  const runOnFocus = options.runOnFocus ?? true;
  const minGapMs = options.minGapMs ?? 2_500;
  let intervalId: number | null = null;
  let lastTickAt = 0;

  const safeTick = () => {
    const now = Date.now();
    if (now - lastTickAt < minGapMs) return;
    lastTickAt = now;
    tick();
  };

  const clear = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = () => {
    clear();
    if (document.visibilityState !== "visible") return;
    intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        safeTick();
      }
    }, intervalMs);
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      safeTick();
      start();
    } else {
      clear();
    }
  };

  const onFocus = () => {
    if (!runOnFocus) return;
    if (document.visibilityState === "visible") {
      safeTick();
    }
  };

  start();
  document.addEventListener("visibilitychange", onVisibility);
  if (runOnFocus) {
    window.addEventListener("focus", onFocus);
  }

  return () => {
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
    if (runOnFocus) {
      window.removeEventListener("focus", onFocus);
    }
  };
}

/** Global header badges — sparse by design. */
export const NAV_BADGES_POLL_MS = 300_000;

/** In-page DM / admin inbox refresh while the tab is visible. */
export const PANEL_POLL_MS = 180_000;

/** Serial status while a result still needs live admin updates. */
export const SERIAL_STATUS_POLL_MS = 180_000;
