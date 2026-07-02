"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BonusRouletteCard from "@/components/BonusRouletteCard";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { useCpBalance } from "@/hooks/useCpBalance";
import { AUTH_DEV_LOGIN_PATH, isAuthDevEnabled, isDevCollectionUserKey } from "@/lib/auth-dev";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { fetchBonusRouletteState } from "@/lib/bonus-roulette-client";
import type { BonusRouletteEntry, BonusRouletteState } from "@/lib/bonus-roulette-store";
import { isUserAuthEnabled } from "@/lib/supabase/config";

type BonusRouletteAppMode = "production" | "dev";

interface BonusRouletteAppProps {
  mode?: BonusRouletteAppMode;
  loginNextPath?: string;
}

export default function BonusRouletteApp({
  mode = "production",
  loginNextPath,
}: BonusRouletteAppProps) {
  const isDevMode = mode === "dev";
  const { userKey, ready: authReady } = useCollectionUserKey();
  const isDevTrial = isDevMode || (isAuthDevEnabled() && isDevCollectionUserKey(userKey));
  const nextPath = loginNextPath ?? (isDevMode ? "/bonus/dev" : "/bonus");
  const { balance, loading: cpLoading } = useCpBalance();
  const [state, setState] = useState<BonusRouletteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!authReady) return;
    if (!userKey) {
      setState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchBonusRouletteState({ forceDev: isDevTrial });
      setState(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authReady, isDevTrial, userKey]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleEntryChange = useCallback((type: BonusRouletteEntry["type"], entry: BonusRouletteEntry) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((item) => (item.type === type ? entry : item)),
      };
    });
  }, []);

  if (!authReady || loading) {
    return (
      <section className="site-container pb-16">
        <div className="panel mx-auto max-w-3xl p-8 text-center text-sm text-cream-faint">
          ボーナス情報を読み込み中…
        </div>
      </section>
    );
  }

  if (!userKey) {
    return (
      <section className="site-container pb-16">
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <p className="text-sm leading-relaxed text-cream-muted">
            デイリー・ウィークリー・マンスリーボーナスはログイン中のアカウントでのみ受け取れます。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isDevMode || !isUserAuthEnabled() ? (
              <Link href={`${AUTH_DEV_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`} className="btn-primary">
                開発用ログイン
              </Link>
            ) : (
              <>
                <Link href={getAuthLoginHref(nextPath)} className="btn-primary">
                  ログイン
                </Link>
                <Link href={getAuthRegisterHref(nextPath)} className="btn-ghost">
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!state?.enabled && !isDevTrial) {
    return (
      <section className="site-container pb-16">
        <div className="panel mx-auto max-w-3xl p-8">
          <p className="text-sm leading-relaxed text-cream-muted">
            ボーナス機能は Supabase 設定後に利用できます。管理者は{" "}
            <code className="text-cream">scripts/supabase-bonus-roulette.sql</code> を SQL Editor
            で実行してください。
          </p>
          {isDevMode && userKey && (
            <p className="mt-3 text-xs text-cream-faint">
              開発用ログイン中でも表示されない場合は、一度ページを再読み込みするか、
              <Link href={`${AUTH_DEV_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`} className="link-gold text-gold">
                開発用ログイン
              </Link>
              から入り直してください。
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="site-container pb-16">
        <div className="panel mx-auto max-w-3xl p-8 text-center text-sm text-cream-faint">
          ボーナス情報を取得できませんでした。
          {error && (
            <p className="mt-3 text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="site-container pb-16">
      <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm leading-relaxed text-cream-muted">
          ルーレットを回して CP を獲得。抽選は「ルーレットを回す」を押した時点で確定します。
          {isDevMode && (
            <span className="mt-1 block text-xs text-cream-faint">
              開発試験モード（Supabase 未設定時はブラウザに保存）
            </span>
          )}
        </p>
        <div className="cp-balance-badge shrink-0" aria-label={`所持 CP ${balance}`}>
          <span className="cp-balance-badge__label">所持 CP</span>
          <span className="cp-balance-badge__value">{cpLoading ? "…" : balance}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-8">
        {state.entries.map((entry) => (
          <BonusRouletteCard
            key={entry.type}
            entry={entry}
            devMode={isDevTrial}
            onEntryChange={(next) => handleEntryChange(entry.type, next)}
          />
        ))}
      </div>

      {error && (
        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {isDevMode && (
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-cream-faint">
          <Link href="/bonus" className="link-gold text-gold">
            ← 本番ボーナス（/bonus）へ
          </Link>
        </p>
      )}
    </section>
  );
}
