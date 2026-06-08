"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOutAction } from "@/app/login/actions";
import LoginNavLink from "@/components/LoginNavLink";
import ProfileNavLink from "@/components/ProfileNavLink";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { getUserProfileLabel } from "@/lib/auth-messages";
import {
  AUTH_DEV_LOGIN_PATH,
  AUTH_DEV_PROFILE_PATH,
  AUTH_DEV_UPDATED_EVENT,
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
  variant?: "header" | "mobile" | "mobile-header-icon";
  menuOpen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [memberLabel, setMemberLabel] = useState<string | null>(null);
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
        const user = data.user;
        setMemberLabel(
          user
            ? getUserProfileLabel(
                user.email,
                typeof user.user_metadata?.display_name === "string"
                  ? user.user_metadata.display_name
                  : null
              )
            : null
        );
        setReady(true);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        setMemberLabel(
          user
            ? getUserProfileLabel(
                user.email,
                typeof user.user_metadata?.display_name === "string"
                  ? user.user_metadata.display_name
                  : null
              )
            : null
        );
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

  useEffect(() => {
    if (!authDevEnabled) return;

    const onDevUpdated = () => refreshDevSession();
    window.addEventListener(AUTH_DEV_UPDATED_EVENT, onDevUpdated);
    return () => window.removeEventListener(AUTH_DEV_UPDATED_EVENT, onDevUpdated);
  }, [authDevEnabled, refreshDevSession]);

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
  const isProfilePage = pathname === AUTH_PROFILE_PATH || pathname === AUTH_DEV_PROFILE_PATH;

  if (variant === "mobile-header-icon") {
    if (!ready) return null;

    if (memberLabel) {
      return (
        <ProfileNavLink
          href={AUTH_PROFILE_PATH}
          label={memberLabel}
          active={isProfilePage}
          layout="icon"
          className={className}
        />
      );
    }

    if (devSession) {
      return (
        <ProfileNavLink
          href={AUTH_DEV_PROFILE_PATH}
          label={devSession.displayName}
          active={isProfilePage}
          layout="icon"
          className={className}
        />
      );
    }

    return null;
  }

  if (!ready) {
    return (
      <span className={`text-[11px] text-cream-faint ${className}`.trim()} aria-hidden="true">
        …
      </span>
    );
  }

  if (memberLabel) {
    const profileHref = AUTH_PROFILE_PATH;
    const label = memberLabel;

    if (variant === "mobile") {
      return (
        <div className={`mobile-nav-panel__auth-member ${className}`.trim()}>
          <ProfileNavLink
            href={profileHref}
            label={label}
            active={isProfilePage}
            layout="stacked"
            tabIndex={menuOpen ? 0 : -1}
          />
          <form action={signOutAction}>
            <button
              type="submit"
              tabIndex={menuOpen ? 0 : -1}
              className="mobile-nav-panel__auth-button"
            >
              ログアウト
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <ProfileNavLink href={profileHref} label={label} active={isProfilePage} />
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
        <div className={`mobile-nav-panel__auth-member ${className}`.trim()}>
          <ProfileNavLink
            href={profileHref}
            label={devSession.displayName}
            active={isProfilePage}
            layout="stacked"
            tabIndex={menuOpen ? 0 : -1}
          />
          <button
            type="button"
            onClick={handleDevLogout}
            tabIndex={menuOpen ? 0 : -1}
            className="mobile-nav-panel__auth-button"
          >
            ログアウト
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <ProfileNavLink
          href={profileHref}
          label={devSession.displayName}
          active={isProfilePage}
        />
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
      <div className={`mobile-nav-panel__auth-grid ${className}`.trim()}>
        <Link
          href={loginHref}
          className={`mobile-nav-panel__auth-link ${
            isLoginPage && !isRegisterPage ? "mobile-nav-panel__auth-link--active" : ""
          }`}
          tabIndex={menuOpen ? 0 : -1}
          aria-current={isLoginPage && !isRegisterPage ? "page" : undefined}
        >
          ログイン
        </Link>
        {authEnabled ? (
          <Link
            href={registerHref}
            className={`mobile-nav-panel__auth-link ${
              isRegisterPage ? "mobile-nav-panel__auth-link--active" : ""
            }`}
            tabIndex={menuOpen ? 0 : -1}
            aria-current={isRegisterPage ? "page" : undefined}
          >
            新規登録
          </Link>
        ) : (
          <span className="mobile-nav-panel__auth-spacer" aria-hidden="true" />
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
