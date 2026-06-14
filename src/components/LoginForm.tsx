"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  requestPasswordResetAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  type AuthFormState,
} from "@/app/login/actions";
import LoginPanelFrame from "@/components/LoginPanelFrame";
import { getAuthCallbackErrorMessage } from "@/lib/auth-messages";
import { AUTH_DEV_LOGIN_PATH, isAuthDevEnabled } from "@/lib/auth-dev";
import { getAuthRegisterHref } from "@/lib/auth-routes";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-cream focus:border-gold focus:outline-none";

const initialState: AuthFormState = {};

type AuthMode = "signin" | "signup" | "forgot" | "resend";

interface LoginFormProps {
  authEnabled: boolean;
  missingEnv: string[];
  defaultMode?: "signin" | "signup";
}

function resolveInitialMode(
  searchParams: ReturnType<typeof useSearchParams>,
  defaultMode: "signin" | "signup"
): AuthMode {
  const mode = searchParams.get("mode");
  if (mode === "signup" || mode === "register") return "signup";
  if (mode === "forgot") return "forgot";
  if (mode === "resend") return "resend";
  return defaultMode;
}

export default function LoginForm({
  authEnabled,
  missingEnv,
  defaultMode = "signin",
}: LoginFormProps) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const [mode, setMode] = useState<AuthMode>(() => resolveInitialMode(searchParams, defaultMode));
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialState);
  const [forgotState, forgotFormAction, forgotPending] = useActionState(
    requestPasswordResetAction,
    initialState
  );
  const [resendState, resendFormAction, resendPending] = useActionState(
    resendConfirmationAction,
    initialState
  );

  useEffect(() => {
    setMode(resolveInitialMode(searchParams, defaultMode));
  }, [searchParams, defaultMode]);

  const callbackError = getAuthCallbackErrorMessage(searchParams.get("error"));
  const confirmed = searchParams.get("confirmed") === "1";

  const state =
    mode === "signin"
      ? signInState
      : mode === "signup"
        ? signUpState
        : mode === "forgot"
          ? forgotState
          : resendState;
  const pending =
    mode === "signin"
      ? signInPending
      : mode === "signup"
        ? signUpPending
        : mode === "forgot"
          ? forgotPending
          : resendPending;

  if (!authEnabled) {
    return (
      <LoginPanelFrame centered>
        <p className="text-sm leading-relaxed text-cream-muted">
          会員ログイン・新規登録（メール認証）は Supabase Auth の設定後に利用できます。
        </p>
        {missingEnv.length > 0 && (
          <ul className="mt-4 space-y-1 text-left text-xs text-cream-faint">
            {missingEnv.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        )}
        {isAuthDevEnabled() && (
          <Link href={AUTH_DEV_LOGIN_PATH} className="btn-primary mt-6 inline-flex min-h-11 items-center px-6">
            開発用テストログイン
          </Link>
        )}
        <Link href="/" className="btn-ghost mt-3 inline-flex min-h-11 items-center px-6">
          トップへ戻る
        </Link>
      </LoginPanelFrame>
    );
  }

  const showMainTabs = mode === "signin" || mode === "signup";

  return (
    <LoginPanelFrame>
      {confirmed && (
        <p className="mb-4 rounded border border-gold/30 bg-gold/10 px-3 py-2 text-sm leading-relaxed text-cream-muted" role="status">
          メール認証が完了しました。ログインしてご利用ください。
        </p>
      )}

      {callbackError && (
        <p className="mb-4 text-sm leading-relaxed text-red-300" role="alert">
          {callbackError}
        </p>
      )}

      {showMainTabs && (
        <div className="mb-6 grid grid-cols-2 gap-1 border border-[var(--color-border)] p-1">
          <button
            type="button"
            className={`min-h-10 px-3 text-xs tracking-[0.15em] transition-colors ${
              mode === "signin" ? "bg-gold/15 text-gold" : "text-cream-muted hover:text-cream"
            }`}
            onClick={() => setMode("signin")}
          >
            ログイン
          </button>
          <button
            type="button"
            className={`min-h-10 px-3 text-xs tracking-[0.15em] transition-colors ${
              mode === "signup" ? "bg-gold/15 text-gold" : "text-cream-muted hover:text-cream"
            }`}
            onClick={() => setMode("signup")}
          >
            新規登録
          </button>
        </div>
      )}

      {!showMainTabs && (
        <div className="mb-6 border-b border-[var(--color-border)] pb-4">
          <p className="section-label mb-1">{mode === "forgot" ? "Reset" : "Verify"}</p>
          <h2 className="font-display text-lg text-gold">
            {mode === "forgot" ? "パスワード再設定" : "確認メール再送"}
          </h2>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="link-gold mt-3 text-xs text-gold"
          >
            ← ログインに戻る
          </button>
        </div>
      )}

      {mode === "signin" && (
        <form action={signInFormAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs text-cream-muted">
              メールアドレス
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs text-cream-muted">
              パスワード
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full min-h-11">
            {pending ? "ログイン中…" : "ログイン"}
          </button>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="link-gold text-cream-faint hover:text-gold"
            >
              パスワードをお忘れですか？
            </button>
            <button
              type="button"
              onClick={() => setMode("resend")}
              className="link-gold text-cream-faint hover:text-gold"
            >
              確認メールを再送
            </button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form action={signUpFormAction} className="space-y-4">
          <div>
            <label htmlFor="signup-display-name" className="mb-1.5 block text-xs text-cream-muted">
              VRChat上の表示名
            </label>
            <input
              id="signup-display-name"
              name="displayName"
              type="text"
              autoComplete="nickname"
              required
              maxLength={32}
              placeholder="VRChatで表示されている名前"
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream-faint">
              イベント参加時の呼び名として使用します。メールアドレスと同じ名前は登録できません。
            </p>
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-xs text-cream-muted">
              メールアドレス
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-xs text-cream-muted">
              パスワード（6文字以上）
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-password-confirm" className="mb-1.5 block text-xs text-cream-muted">
              パスワード（確認）
            </label>
            <input
              id="signup-password-confirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full min-h-11">
            {pending ? "送信中…" : "確認メールを送信"}
          </button>
          <p className="text-[11px] leading-relaxed text-cream-faint">
            登録後、確認メールのリンクを開くと本登録が完了し、そのままログインした状態でプロフィールへ移動します。迷惑メールフォルダもご確認ください。
          </p>
          <p className="text-center text-[11px] text-cream-faint">
            メールが届かない場合は{" "}
            <button type="button" onClick={() => setMode("resend")} className="link-gold text-gold">
              確認メール再送
            </button>
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form action={forgotFormAction} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-xs text-cream-muted">
              登録済みのメールアドレス
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full min-h-11">
            {pending ? "送信中…" : "再設定メールを送信"}
          </button>
        </form>
      )}

      {mode === "resend" && (
        <form action={resendFormAction} className="space-y-4">
          <div>
            <label htmlFor="resend-email" className="mb-1.5 block text-xs text-cream-muted">
              登録したメールアドレス
            </label>
            <input
              id="resend-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full min-h-11">
            {pending ? "送信中…" : "確認メールを再送"}
          </button>
        </form>
      )}

      {state.error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-4 text-sm leading-relaxed text-cream-muted" role="status">
          {state.success}
        </p>
      )}

      {showMainTabs && mode === "signin" && (
        <p className="mt-6 text-center text-xs text-cream-faint">
          アカウントをお持ちでない方は{" "}
          <button type="button" onClick={() => setMode("signup")} className="link-gold text-gold">
            新規登録
          </button>
        </p>
      )}

      {showMainTabs && mode === "signup" && (
        <p className="mt-6 text-center text-xs text-cream-faint">
          すでに登録済みの方は{" "}
          <button type="button" onClick={() => setMode("signin")} className="link-gold text-gold">
            ログイン
          </button>
        </p>
      )}

      {defaultMode === "signin" ? (
        <p className="mt-4 text-center text-xs text-cream-faint">
          <Link href={getAuthRegisterHref(nextPath)} className="link-gold text-gold">
            新規登録ページへ
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-cream-faint">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="link-gold text-gold">
            ログインページへ
          </Link>
        </p>
      )}

      {isAuthDevEnabled() && (
        <p className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-xs text-cream-faint">
          ローカル開発の試験は{" "}
          <Link href={AUTH_DEV_LOGIN_PATH} className="link-gold text-gold">
            /login/dev
          </Link>
        </p>
      )}
    </LoginPanelFrame>
  );
}
