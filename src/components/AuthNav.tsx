"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOutAction } from "@/app/login/actions";
import LoginNavLink from "@/components/LoginNavLink";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { getUserDisplayLabel } from "@/lib/auth-messages";
import {
  AUTH_DEV_LOGIN_PATH,
  AUTH_DEV_PROFILE_PATH,
  AUTH_PROFILE_PATH,
  clearDevSession,
  isAuthDevEnabled,
  readDevSession,
  type AuthDevSession,
} from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export default function AuthNav({
  className = "",
  variant = "header",
  menuOpen = true,
}: {
  className?: string;
  variant?: "header" | "mobile";
  menuOpen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [devSession, setDevSession] = useState<AuthDevSession | null>(null);
  const [ready, setReady] = useState(false);
  const authEnabled = isUserAuthEnabled();
  const authDevEnabled = isAuthDevEnabled();

  const refreshDevSession = useCallback(() => {
    if (!authDevEnabled) {
      setDevSession(null);
      return;
    }
    setDevSession(readDevSession());
  }, [authDevEnabled]);

  useEffect(() => {
    refreshDevSession();

    if (!authEnabled) {
      setReady(true);
      return;
    }

    let mounted = true;

    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        setEmail(data.user?.email ?? null);
        setReady(true);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      if (mounted) setReady(true);
    }

    return () => {
      mounted = false;
    };
  }, [authEnabled, refreshDevSession]);

  useEffect(() => {
    refreshDevSession();
  }, [pathname, refreshDevSession]);

  const handleDevLogout = () => {
    clearDevSession();
    setDevSession(null);
    router.push(AUTH_DEV_LOGIN_PATH);
    router.refresh();
  };

  const loginHref =
    authDevEnabled && !authEnabled ? AUTH_DEV_LOGIN_PATH : getAuthLoginHref("/profile");
  const registerHref = getAuthRegisterHref("/profile");
  const isLoginPage =
    pathname === "/login" || pathname === AUTH_DEV_LOGIN_PATH || pathname === "/register";
  const isRegisterPage = pathname === "/register";

  if (!ready) {
    return (
      <span className={`text-[11px] text-cream-faint ${className}`.trim()} aria-hidden="true">
        …
      </span>
    );
  }

  if (email) {
    const profileHref = AUTH_PROFILE_PATH;
    const label = getUserDisplayLabel(email);

    if (variant === "mobile") {
      return (
        <div className={`space-y-3 text-center ${className}`.trim()}>
          <Link
            href={profileHref}
            className="block text-sm text-cream-muted transition-colors hover:text-gold"
            tabIndex={menuOpen ? 0 : -1}
          >
            {label}
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              tabIndex={menuOpen ? 0 : -1}
              className="btn-ghost min-h-11 w-full max-w-xs"
            >
              ログアウト
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <Link
          href={profileHref}
          className="hidden max-w-[9rem] truncate text-[11px] text-cream-muted transition-colors hover:text-gold xl:inline"
        >
          {label}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="border border-[var(--color-border)] px-3 py-1.5 text-[11px] tracking-[0.12em] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold"
          >
            ログアウト
          </button>
        </form>
      </div>
    );
  }

  if (devSession) {
    const profileHref = AUTH_DEV_PROFILE_PATH;

    if (variant === "mobile") {
      return (
        <div className={`space-y-3 text-center ${className}`.trim()}>
          <Link
            href={profileHref}
            className="block text-sm text-cream-muted transition-colors hover:text-gold"
            tabIndex={menuOpen ? 0 : -1}
          >
            {devSession.displayName}
          </Link>
          <button
            type="button"
            onClick={handleDevLogout}
            tabIndex={menuOpen ? 0 : -1}
            className="btn-ghost min-h-11 w-full max-w-xs"
          >
            ログアウト
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <Link
          href={profileHref}
          className="hidden max-w-[9rem] truncate text-[11px] text-cream-muted transition-colors hover:text-gold xl:inline"
        >
          {devSession.displayName}
        </Link>
        <button
          type="button"
          onClick={handleDevLogout}
          className="border border-[var(--color-border)] px-3 py-1.5 text-[11px] tracking-[0.12em] text-cream-muted transition-colors hover:border-gold/40 hover:text-gold"
        >
          ログアウト
        </button>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className={`space-y-3 text-center ${className}`.trim()}>
        <LoginNavLink
          href={loginHref}
          active={isLoginPage && !isRegisterPage}
          layout="stacked"
          tabIndex={menuOpen ? 0 : -1}
        />
        {authEnabled && (
          <Link
            href={registerHref}
            className={`block py-3 text-sm transition-colors ${
              isRegisterPage ? "text-gold" : "text-cream-muted hover:text-gold"
            }`}
            tabIndex={menuOpen ? 0 : -1}
            aria-current={isRegisterPage ? "page" : undefined}
          >
            新規登録
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <LoginNavLink href={loginHref} active={isLoginPage && !isRegisterPage} />
      {authEnabled && (
        <Link
          href={registerHref}
          className={`hidden px-2 py-1.5 text-[11px] tracking-[0.08em] transition-colors sm:inline ${
            isRegisterPage ? "text-gold" : "text-cream-muted hover:text-gold"
          }`}
          aria-current={isRegisterPage ? "page" : undefined}
        >
          新規登録
        </Link>
      )}
    </div>
  );
}
