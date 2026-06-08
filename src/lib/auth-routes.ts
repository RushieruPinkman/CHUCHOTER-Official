import { AUTH_DEV_LOGIN_PATH, isAuthDevEnabled } from "@/lib/auth-dev";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export function getAuthLoginHref(nextPath: string): string {
  if (isAuthDevEnabled() && !isUserAuthEnabled()) {
    return `${AUTH_DEV_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
  }
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function getAuthRegisterHref(nextPath?: string): string {
  if (!nextPath) return "/register";
  return `/register?next=${encodeURIComponent(nextPath)}`;
}
