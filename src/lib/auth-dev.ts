export const AUTH_DEV_STORAGE_KEY = "chuchoter-auth-dev";
export const AUTH_DEV_UPDATED_EVENT = "chuchoter-auth-dev-updated";

export const AUTH_DEV_LOGIN_PATH = "/login/dev" as const;
export const AUTH_DEV_PROFILE_PATH = "/profile/dev" as const;
export const AUTH_PROFILE_PATH = "/profile" as const;

export interface AuthDevSession {
  userId: string;
  email: string;
  displayName: string;
  loggedInAt: string;
}

/** 開発環境（next dev）でのみ true。本番ビルドでは常に false */
export function isAuthDevEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isDevCollectionUserKey(userKey: string | null | undefined): boolean {
  return Boolean(userKey?.startsWith("dev:"));
}

/** Supabase 設定の有無に関わらず、開発用 userKey なら API に dev ヘッダーを送る */
export function shouldUseDevApiAuth(userKey: string | null | undefined): boolean {
  return isAuthDevEnabled() && isDevCollectionUserKey(userKey);
}

/** fetch の Header に載せるため ASCII 安全にエンコード */
export function encodeDevDisplayNameHeader(displayName: string): string {
  return encodeURIComponent(displayName.trim());
}

export function decodeDevDisplayNameHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function createDevSession(email: string, displayName: string): AuthDevSession {
  return {
    userId: `dev-${Date.now()}`,
    email,
    displayName,
    loggedInAt: new Date().toISOString(),
  };
}

export function readDevSession(): AuthDevSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_DEV_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AuthDevSession;
    if (!parsed.email?.trim() || !parsed.displayName?.trim()) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeDevSession(session: AuthDevSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_DEV_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(AUTH_DEV_UPDATED_EVENT));
}

export function updateDevSessionDisplayName(displayName: string): AuthDevSession | null {
  const session = readDevSession();
  if (!session) return null;
  const nextSession = { ...session, displayName: displayName.trim() };
  if (!nextSession.displayName) return null;
  writeDevSession(nextSession);
  return nextSession;
}

export function clearDevSession(): void {
  localStorage.removeItem(AUTH_DEV_STORAGE_KEY);
}

export function formatAuthTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
