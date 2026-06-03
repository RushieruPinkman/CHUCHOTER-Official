export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "chuchoter-theme";
export const THEME_TRANSITION_MS = 300;

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "dark" || value === "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

let themeTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    root.classList.remove("theme-transition");
    return;
  }

  if (themeTransitionTimeout) {
    clearTimeout(themeTransitionTimeout);
  }

  root.classList.add("theme-transition");
  themeTransitionTimeout = setTimeout(() => {
    root.classList.remove("theme-transition");
    themeTransitionTimeout = null;
  }, THEME_TRANSITION_MS);
}
