"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateDisplayNameAction, type ProfileFormState } from "@/app/profile/actions";
import { dispatchAuthMemberUpdated } from "@/lib/auth-client";
import {
  AUTH_DEV_LOGIN_PATH,
  formatAuthTimestamp,
  updateDevSessionDisplayName,
} from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/client";

export interface ProfileView {
  displayName: string;
  email: string;
  loggedInAt?: string;
  mode: "production" | "dev";
}

interface ProfilePanelProps {
  profile: ProfileView;
  onDisplayNameChange?: (displayName: string) => void;
}

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-cream focus:border-gold focus:outline-none";

const initialState: ProfileFormState = {};

export default function ProfilePanel({ profile, onDisplayNameChange }: ProfilePanelProps) {
  const router = useRouter();
  const isDev = profile.mode === "dev";
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [devError, setDevError] = useState<string | null>(null);
  const [devSuccess, setDevSuccess] = useState<string | null>(null);
  const [formState, formAction, pending] = useActionState(updateDisplayNameAction, initialState);

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  useEffect(() => {
    if (formState.displayName) {
      setDisplayName(formState.displayName);
      setEditing(false);
      dispatchAuthMemberUpdated(formState.displayName);
      router.refresh();

      void (async () => {
        try {
          const supabase = createClient();
          await supabase.auth.refreshSession();
        } catch {
          /* セッション更新に失敗しても表示名はイベントで反映済み */
        }
      })();
    }
  }, [formState.displayName, router]);

  const handleDevSave = () => {
    setDevError(null);
    setDevSuccess(null);

    const nextName = displayName.trim();
    if (!nextName) {
      setDevError("表示名を入力してください。");
      return;
    }
    if (nextName.length > 32) {
      setDevError("表示名は32文字以内で入力してください。");
      return;
    }

    const updated = updateDevSessionDisplayName(nextName);
    if (!updated) {
      setDevError("表示名の更新に失敗しました。");
      return;
    }

    onDisplayNameChange?.(updated.displayName);
    setDisplayName(updated.displayName);
    setEditing(false);
    dispatchAuthMemberUpdated(updated.displayName);
    setDevSuccess("表示名を更新しました。");
    router.refresh();
  };

  const handleCancel = () => {
    setDisplayName(profile.displayName);
    setEditing(false);
    setDevError(null);
  };

  const activeError = isDev ? devError : formState.error;
  const activeSuccess = isDev ? devSuccess : formState.success;

  return (
    <div className="auth-panel mx-auto max-w-lg border border-[var(--color-border)] bg-deep/90 p-6 md:p-8">
      {isDev && (
        <p className="mb-5 rounded-sm border border-gold/25 bg-gold/10 px-3 py-2 text-center text-xs leading-relaxed text-cream-muted">
          【開発専用】テストアカウント — 本番には反映されません
        </p>
      )}

      <div className="space-y-6 text-center">
        <p className="auth-status-badge auth-status-badge--panel" role="status">
          <span className="auth-status-badge__dot" aria-hidden="true" />
          ログイン中
        </p>

        <div>
          <p className="section-label mb-2">Member</p>
          {!editing ? (
            <>
              <h2 className="font-display text-2xl text-gold md:text-3xl">{displayName}</h2>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setDevError(null);
                  setDevSuccess(null);
                }}
                className="btn-ghost mt-4 min-h-10 px-5 text-xs"
              >
                表示名を変更
              </button>
            </>
          ) : isDev ? (
            <div className="mx-auto max-w-sm text-left">
              <label htmlFor="profile-display-name" className="mb-1.5 block text-xs text-cream-muted">
                表示名
              </label>
              <input
                id="profile-display-name"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                maxLength={32}
                required
                className={inputClass}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDevSave}
                  className="btn-primary min-h-10 px-5 text-xs"
                >
                  保存
                </button>
                <button type="button" onClick={handleCancel} className="btn-ghost min-h-10 px-5 text-xs">
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="mx-auto max-w-sm text-left">
              <label htmlFor="profile-display-name" className="mb-1.5 block text-xs text-cream-muted">
                表示名
              </label>
              <input
                id="profile-display-name"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                maxLength={32}
                required
                className={inputClass}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary min-h-10 px-5 text-xs disabled:opacity-40"
                >
                  {pending ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="btn-ghost min-h-10 px-5 text-xs disabled:opacity-40"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </div>

        {activeError && (
          <p className="text-sm leading-relaxed text-red-300" role="alert">
            {activeError}
          </p>
        )}
        {activeSuccess && (
          <p className="text-sm leading-relaxed text-cream-muted" role="status">
            {activeSuccess}
          </p>
        )}

        <dl className="space-y-4 text-left">
          <div className="border-b border-[var(--color-border)] pb-4">
            <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
              Email
            </dt>
            <dd className="break-all text-sm text-cream">{profile.email}</dd>
          </div>
          {profile.loggedInAt && (
            <div className="border-b border-[var(--color-border)] pb-4">
              <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
                {isDev ? "テストログイン" : "登録・ログイン"}
              </dt>
              <dd className="text-sm text-cream-muted">{formatAuthTimestamp(profile.loggedInAt)}</dd>
            </div>
          )}
          <div>
            <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
              Account
            </dt>
            <dd className="text-sm text-cream-muted">
              {isDev ? "ローカル開発用テストアカウント" : "CHUCHOTER 会員"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isDev ? (
          <Link href={AUTH_DEV_LOGIN_PATH} className="btn-ghost min-h-11 px-6 text-center">
            別アカウントで試す
          </Link>
        ) : (
          <Link href="/gacha" className="btn-ghost min-h-11 px-6 text-center">
            運命の扉へ
          </Link>
        )}
        <Link href="/" className="btn-ghost min-h-11 px-6 text-center">
          トップへ
        </Link>
      </div>
    </div>
  );
}
