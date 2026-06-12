"use client";

import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import {
  CP_ADMIN_BULK_GRANT_AMOUNT,
  CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
} from "@/lib/cp";

interface CpAdminPanelProps {
  authJsonHeaders: () => HeadersInit;
  remoteStorage: boolean;
}

export default function CpAdminPanel({ authJsonHeaders, remoteStorage }: CpAdminPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cp", { headers: authJsonHeaders() });
      if (!res.ok) {
        throw new Error(await readApiError(res, "CP 情報の取得に失敗しました"));
      }
      const body = (await res.json()) as { enabled: boolean; userCount: number };
      setEnabled(body.enabled);
      setUserCount(body.userCount);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "CP 情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authJsonHeaders]);

  useEffect(() => {
    if (!remoteStorage) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [remoteStorage, refresh]);

  const handleGrantAll = async () => {
    setMessage(null);
    setError(null);

    const targetLabel =
      userCount === null ? "全ユーザー" : `${userCount} 名のユーザー`;
    const firstOk = window.confirm(
      `【1/2】${targetLabel}に ${CP_ADMIN_BULK_GRANT_AMOUNT} CP を付与します。\n\nこの操作は取り消せません。続行しますか？`
    );
    if (!firstOk) return;

    const typed = window.prompt(
      `【2/2】実行するには「${CP_ADMIN_BULK_GRANT_CONFIRM_TEXT}」と入力してください。`
    );
    if (typed !== CP_ADMIN_BULK_GRANT_CONFIRM_TEXT) {
      setError(
        typed === null
          ? "付与をキャンセルしました。"
          : `確認テキストが一致しません。「${CP_ADMIN_BULK_GRANT_CONFIRM_TEXT}」と正確に入力してください。`
      );
      return;
    }

    setGranting(true);
    try {
      const res = await fetch("/api/admin/cp", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          action: "grant_all",
          confirmText: CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "CP 付与に失敗しました"));
      }

      const body = (await res.json()) as {
        granted: number;
        failed: number;
        userCount: number;
        amount: number;
      };

      setMessage(
        body.failed > 0
          ? `${body.granted} 名に ${body.amount} CP を付与しました（${body.failed} 名は失敗）。`
          : `全 ${body.granted} 名に ${body.amount} CP を付与しました。`
      );
      await refresh();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "CP 付与に失敗しました");
    } finally {
      setGranting(false);
    }
  };

  if (!remoteStorage) {
    return (
      <div className="panel p-6 text-sm leading-relaxed text-cream-muted">
        Supabase が未設定のため、CP 管理は利用できません。
      </div>
    );
  }

  return (
    <div className="panel p-6 md:p-8">
      <p className="section-label mb-2">CP</p>
      <h2 className="font-display text-xl text-gold md:text-2xl">シュシュテポイント管理</h2>
      <p className="mt-3 text-sm leading-relaxed text-cream-muted">
        登録ユーザー（Supabase Auth）および CP・DM 利用履歴のあるアカウントが対象です。
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : !enabled ? (
        <p className="mt-6 text-sm text-cream-muted">
          CP テーブルが未作成です。Supabase SQL Editor で `scripts/supabase-cp.sql` を実行してください。
        </p>
      ) : (
        <div className="mt-6 space-y-4 border border-[var(--color-border)] bg-deep/40 p-5">
          <p className="text-sm text-cream-muted">
            付与対象:{" "}
            <strong className="text-cream">{userCount ?? 0} 名</strong>
          </p>
          <p className="text-sm text-cream-muted">
            付与量:{" "}
            <strong className="text-gold">{CP_ADMIN_BULK_GRANT_AMOUNT} CP</strong> / ユーザー
          </p>
          <button
            type="button"
            onClick={() => void handleGrantAll()}
            disabled={granting || !userCount}
            className="btn-primary min-h-11 px-6 text-sm disabled:opacity-40"
          >
            {granting ? "付与中…" : `全ユーザーに ${CP_ADMIN_BULK_GRANT_AMOUNT} CP 付与`}
          </button>
          <p className="text-[11px] leading-relaxed text-cream-faint">
            実行時は確認ダイアログのあと、「{CP_ADMIN_BULK_GRANT_CONFIRM_TEXT}」の入力が必要です。
          </p>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm text-gold" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
