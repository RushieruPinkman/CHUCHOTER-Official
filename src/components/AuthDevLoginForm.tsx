"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import LoginPanelFrame from "@/components/LoginPanelFrame";
import {
  AUTH_DEV_PROFILE_PATH,
  createDevSession,
  writeDevSession,
} from "@/lib/auth-dev";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-cream focus:border-gold focus:outline-none";

export default function AuthDevLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? AUTH_DEV_PROFILE_PATH;
  const [displayName, setDisplayName] = useState("テスト住人");
  const [email, setEmail] = useState("dev@chuchoter.local");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = displayName.trim();
    const mail = email.trim();

    if (!name || !mail) {
      setError("表示名とメールアドレスを入力してください。");
      return;
    }

    writeDevSession(createDevSession(mail, name));
    router.push(nextPath.startsWith("/") ? nextPath : AUTH_DEV_PROFILE_PATH);
    router.refresh();
  };

  const handleQuickLogin = () => {
    writeDevSession(createDevSession("dev@chuchoter.local", "テスト住人"));
    router.push(AUTH_DEV_PROFILE_PATH);
    router.refresh();
  };

  return (
    <LoginPanelFrame>
      <p className="mb-5 rounded-sm border border-gold/25 bg-gold/10 px-3 py-2 text-center text-xs leading-relaxed text-cream-muted">
        【開発専用】localStorage に保存します。本番サイトには公開されません。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="dev-display-name" className="mb-1.5 block text-xs text-cream-muted">
            VRChat上の表示名
          </label>
          <input
            id="dev-display-name"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="nickname"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="dev-email" className="mb-1.5 block text-xs text-cream-muted">
            メールアドレス（テスト用）
          </label>
          <input
            id="dev-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>
        <button type="submit" className="btn-primary w-full min-h-11">
          テストログイン
        </button>
      </form>

      <button
        type="button"
        onClick={handleQuickLogin}
        className="btn-ghost mt-3 w-full min-h-11"
      >
        ワンクリックで試す
      </button>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-cream-faint">
        <Link href="/login" className="link-gold text-gold">
          ← 本番ログイン（/login）へ
        </Link>
      </p>
    </LoginPanelFrame>
  );
}
