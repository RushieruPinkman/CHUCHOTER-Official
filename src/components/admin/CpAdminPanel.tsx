"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readApiError } from "@/lib/api-error";
import {
  CP_ADMIN_BULK_GRANT_AMOUNT,
  CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
  CP_ADMIN_USER_GRANT_CONFIRM_TEXT,
} from "@/lib/cp";

interface CpAdminUser {
  userKey: string;
  displayName: string;
  email: string | null;
  balance: number | null;
}

interface CpAdminPanelProps {
  authJsonHeaders: () => HeadersInit;
  remoteStorage: boolean;
}

export default function CpAdminPanel({ authJsonHeaders, remoteStorage }: CpAdminPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [users, setUsers] = useState<CpAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [grantingUser, setGrantingUser] = useState(false);
  const [selectedUserKey, setSelectedUserKey] = useState("");
  const [grantAmount, setGrantAmount] = useState("100");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.userKey === selectedUserKey) ?? null,
    [selectedUserKey, users]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cp", { headers: authJsonHeaders() });
      if (!res.ok) {
        throw new Error(await readApiError(res, "CP 情報の取得に失敗しました"));
      }
      const body = (await res.json()) as {
        enabled: boolean;
        userCount: number;
        users: CpAdminUser[];
      };
      setEnabled(body.enabled);
      setUserCount(body.userCount);
      setUsers(body.users ?? []);
      setSelectedUserKey((current) => current || body.users?.[0]?.userKey || "");
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

  const handleGrantUser = async () => {
    setMessage(null);
    setError(null);

    if (!selectedUser) {
      setError("付与対象ユーザーを選択してください。");
      return;
    }

    const amount = Number.parseInt(grantAmount, 10);
    if (!Number.isFinite(amount) || amount < 1) {
      setError("付与 CP は 1 以上の整数で入力してください。");
      return;
    }

    const targetLabel = selectedUser.email
      ? `${selectedUser.displayName}（${selectedUser.email}）`
      : selectedUser.displayName;

    const firstOk = window.confirm(
      `【1/2】${targetLabel} に ${amount} CP を付与します。\n\nこの操作は取り消せません。続行しますか？`
    );
    if (!firstOk) return;

    const typed = window.prompt(
      `【2/2】実行するには「${CP_ADMIN_USER_GRANT_CONFIRM_TEXT}」と入力してください。`
    );
    if (typed !== CP_ADMIN_USER_GRANT_CONFIRM_TEXT) {
      setError(
        typed === null
          ? "付与をキャンセルしました。"
          : `確認テキストが一致しません。「${CP_ADMIN_USER_GRANT_CONFIRM_TEXT}」と正確に入力してください。`
      );
      return;
    }

    setGrantingUser(true);
    try {
      const res = await fetch("/api/admin/cp", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          action: "grant_user",
          userKey: selectedUser.userKey,
          amount,
          confirmText: CP_ADMIN_USER_GRANT_CONFIRM_TEXT,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "CP 付与に失敗しました"));
      }

      const body = (await res.json()) as { amount: number; balance: number };
      setMessage(
        `${targetLabel} に ${body.amount} CP を付与しました（残高 ${body.balance} CP）。`
      );
      await refresh();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "CP 付与に失敗しました");
    } finally {
      setGrantingUser(false);
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
        <div className="mt-6 space-y-6">
          <div className="space-y-4 border border-[var(--color-border)] bg-deep/40 p-5">
            <h3 className="font-serif-jp text-base text-cream">特定ユーザーへの付与</h3>
            <p className="text-sm text-cream-muted">
              お詫び CP など、任意のユーザーへ任意の CP を付与できます。
            </p>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
              <label className="block text-sm text-cream-muted">
                <span className="mb-2 block text-[11px] tracking-[0.08em] text-cream-faint">
                  対象ユーザー
                </span>
                <select
                  value={selectedUserKey}
                  onChange={(event) => setSelectedUserKey(event.target.value)}
                  className="w-full min-h-11 border border-[var(--color-border)] bg-deep/80 px-3 text-sm text-cream"
                >
                  {users.length === 0 ? (
                    <option value="">ユーザーが見つかりません</option>
                  ) : (
                    users.map((user) => (
                      <option key={user.userKey} value={user.userKey}>
                        {user.displayName}
                        {user.email ? ` (${user.email})` : ""}
                        {user.balance !== null ? ` — ${user.balance} CP` : ""}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm text-cream-muted">
                <span className="mb-2 block text-[11px] tracking-[0.08em] text-cream-faint">
                  付与 CP
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={grantAmount}
                  onChange={(event) => setGrantAmount(event.target.value)}
                  className="w-full min-h-11 border border-[var(--color-border)] bg-deep/80 px-3 text-sm text-cream"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void handleGrantUser()}
              disabled={grantingUser || !selectedUser}
              className="btn-primary min-h-11 px-6 text-sm disabled:opacity-40"
            >
              {grantingUser ? "付与中…" : "選択ユーザーに CP 付与"}
            </button>
            <p className="text-[11px] leading-relaxed text-cream-faint">
              実行時は確認ダイアログのあと、「{CP_ADMIN_USER_GRANT_CONFIRM_TEXT}」の入力が必要です。
            </p>
          </div>

          <div className="space-y-4 border border-[var(--color-border)] bg-deep/40 p-5">
            <h3 className="font-serif-jp text-base text-cream">全ユーザー一括付与</h3>
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
