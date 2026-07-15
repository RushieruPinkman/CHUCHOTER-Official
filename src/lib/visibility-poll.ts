/**
 * Visibility-aware polling for client-side refresh loops.
 *
 * Backgrounded tabs pause timers. Focus / visibility return triggers one tick.
 * This cuts Vercel Observability Events from idle multi-tab sessions.
 */
export function startVisibilityAwarePoll(
  tick: () => void,
  intervalMs: number,
  options: { runOnFocus?: boolean } = {}
): () => void {
  const runOnFocus = options.runOnFocus ?? true;
  let intervalId: number | null = null;

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
        tick();
      }
    }, intervalMs);
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      tick();
      start();
    } else {
      clear();
    }
  };

  const onFocus = () => {
    if (!runOnFocus) return;
    if (document.visibilityState === "visible") {
      tick();
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

/** Global header badges — sparse by design (events + custom updates cover the rest). */
export const NAV_BADGES_POLL_MS = 180_000;

/** In-page DM / admin inbox refresh while the tab is visible. */
export const PANEL_POLL_MS = 90_000;

/** Serial status while a result modal / history row needs live admin updates. */
export const SERIAL_STATUS_POLL_MS = 90_000;
