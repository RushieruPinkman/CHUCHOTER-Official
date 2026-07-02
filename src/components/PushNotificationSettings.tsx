"use client";

import { useCallback, useEffect, useState } from "react";
import { buildCpRequestHeaders } from "@/lib/cp-client";
import {
  getLocalPushSubscriptionState,
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  updatePushPreferences,
} from "@/lib/push-client";

interface PushStatus {
  configured: boolean;
  subscribed: boolean;
  notifyDm: boolean;
  notifyBonus: boolean;
  notifyGacha: boolean;
}

const DEFAULT_STATUS: PushStatus = {
  configured: false,
  subscribed: false,
  notifyDm: true,
  notifyBonus: true,
  notifyGacha: true,
};

export default function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<PushStatus>(DEFAULT_STATUS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const local = await getLocalPushSubscriptionState();
    setSupported(isPushSupported());
    setPermission(local.permission);

    if (!isPushSupported()) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/push/status", {
        headers: await buildCpRequestHeaders(),
        cache: "no-store",
      });

      if (response.status === 401) {
        setStatus(DEFAULT_STATUS);
        return;
      }

      if (response.ok) {
        const body = (await response.json()) as PushStatus;
        setStatus({
          configured: body.configured,
          subscribed: body.subscribed && local.subscribed,
          notifyDm: body.notifyDm,
          notifyBonus: body.notifyBonus,
          notifyGacha: body.notifyGacha,
        });
      }
    } catch {
      setError("通知設定の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await subscribeToPushNotifications({
        notifyDm: status.notifyDm,
        notifyBonus: status.notifyBonus,
        notifyGacha: status.notifyGacha,
      });
      setMessage("プッシュ通知を有効にしました。");
      await refresh();
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : "有効化に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await unsubscribeFromPushNotifications();
      setMessage("プッシュ通知をオフにしました。");
      await refresh();
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "解除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handlePreferenceChange = async (
    key: "notifyDm" | "notifyBonus" | "notifyGacha",
    value: boolean
  ) => {
    const next = { ...status, [key]: value };
    setStatus(next);
    if (!next.subscribed) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updatePushPreferences({
        notifyDm: next.notifyDm,
        notifyBonus: next.notifyBonus,
        notifyGacha: next.notifyGacha,
      });
      setMessage("通知設定を更新しました。");
    } catch (preferenceError) {
      setError(preferenceError instanceof Error ? preferenceError.message : "更新に失敗しました");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-panel mx-auto max-w-lg border border-[var(--color-border)] bg-deep/90 p-6 md:p-8">
      <p className="section-label mb-2 text-center">Notifications</p>
      <h2 className="mb-2 text-center font-display text-xl text-gold md:text-2xl">プッシュ通知</h2>
      <p className="mb-6 text-center text-xs leading-relaxed text-cream-faint">
        運営DMの返信・未受取ボーナス・無料ガチャリセットをお知らせします（1日1回まで）。
      </p>

      {!supported && !loading && (
        <p className="text-center text-sm text-cream-muted" role="status">
          このブラウザはプッシュ通知に対応していません。
        </p>
      )}

      {supported && !loading && !status.configured && (
        <p className="text-center text-sm text-cream-muted" role="status">
          サーバー側のプッシュ設定（VAPID）が未完了のため、現在は有効化できません。
        </p>
      )}

      {supported && status.configured && (
        <div className="space-y-5">
          <p className="text-center text-xs text-cream-muted" role="status">
            通知の許可: {permission === "granted" ? "許可" : permission === "denied" ? "拒否" : "未設定"}
          </p>

          <div className="space-y-3 border border-[var(--color-border)] p-4">
            <label className="flex items-start gap-3 text-sm text-cream">
              <input
                type="checkbox"
                className="mt-1"
                checked={status.notifyDm}
                disabled={busy}
                onChange={(event) => void handlePreferenceChange("notifyDm", event.target.checked)}
              />
              <span>
                <strong className="text-cream">運営DMの返信</strong>
                <span className="mt-0.5 block text-xs text-cream-faint">運営から返信が届いたとき</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-cream">
              <input
                type="checkbox"
                className="mt-1"
                checked={status.notifyBonus}
                disabled={busy}
                onChange={(event) => void handlePreferenceChange("notifyBonus", event.target.checked)}
              />
              <span>
                <strong className="text-cream">未受取ボーナス</strong>
                <span className="mt-0.5 block text-xs text-cream-faint">毎朝9時（JST）にリマインド</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-cream">
              <input
                type="checkbox"
                className="mt-1"
                checked={status.notifyGacha}
                disabled={busy}
                onChange={(event) => void handlePreferenceChange("notifyGacha", event.target.checked)}
              />
              <span>
                <strong className="text-cream">無料ガチャリセット</strong>
                <span className="mt-0.5 block text-xs text-cream-faint">毎朝9時（JST）・未使用のときのみ</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {!status.subscribed ? (
              <button
                type="button"
                className="btn-primary min-h-11 px-6"
                onClick={() => void handleEnable()}
                disabled={busy || permission === "denied"}
              >
                {busy ? "設定中…" : "通知を有効にする"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost min-h-11 px-6"
                onClick={() => void handleDisable()}
                disabled={busy}
              >
                {busy ? "処理中…" : "通知をオフにする"}
              </button>
            )}
          </div>

          {permission === "denied" && (
            <p className="text-center text-xs leading-relaxed text-cream-faint">
              ブラウザの設定からこのサイトの通知を許可してください。
            </p>
          )}
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 text-center text-sm text-cream-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
