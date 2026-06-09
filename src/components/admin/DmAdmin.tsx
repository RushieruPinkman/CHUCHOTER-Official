"use client";

import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import {
  DM_RETENTION_NOTICE,
  formatDmListTimestamp,
  formatDmTimestamp,
  getDmSenderLabel,
  type DmMessage,
  type DmSettings,
  type DmThreadSummary,
} from "@/lib/dm";
import { DM_UPDATED_EVENT } from "@/lib/dm-client";
import {
  buildDmMessageScrollKey,
  useDmMessageListScroll,
} from "@/hooks/useDmMessageListScroll";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none";

interface DmAdminProps {
  authJsonHeaders: () => HeadersInit;
  remoteStorage: boolean;
}

export default function DmAdmin({ authJsonHeaders, remoteStorage }: DmAdminProps) {
  const [threads, setThreads] = useState<DmThreadSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [activeThread, setActiveThread] = useState<DmThreadSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [settings, setSettings] = useState<DmSettings>({ discordWebhookUrl: "" });
  const [webhookDraft, setWebhookDraft] = useState("");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollKey = buildDmMessageScrollKey(messages, loading);
  const { containerRef, handleScroll, scrollToBottom } = useDmMessageListScroll(scrollKey, {
    paused: loading || !activeThread,
    resetKey: selectedId,
  });

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/admin/dm", { headers: authJsonHeaders() });
    if (!res.ok) {
      throw new Error(await readApiError(res, "DM 一覧の取得に失敗しました"));
    }

    const body = (await res.json()) as {
      threads: DmThreadSummary[];
      unreadTotal: number;
      settings: DmSettings;
    };

    setThreads(body.threads);
    setUnreadTotal(body.unreadTotal);
    setSettings(body.settings);
    setWebhookDraft(body.settings.discordWebhookUrl);
    return body.threads;
  }, [authJsonHeaders]);

  const loadThread = useCallback(
    async (threadId: string) => {
      const res = await fetch(`/api/admin/dm?threadId=${encodeURIComponent(threadId)}`, {
        headers: authJsonHeaders(),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "DM の取得に失敗しました"));
      }

      const body = (await res.json()) as { thread: DmThreadSummary; messages: DmMessage[] };
      setActiveThread(body.thread);
      setMessages(body.messages);
      setSelectedId(threadId);
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId ? { ...thread, adminUnreadCount: 0 } : thread
        )
      );
    },
    [authJsonHeaders]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextThreads = await loadInbox();
      if (selectedId) {
        const stillExists = nextThreads.some((thread) => thread.id === selectedId);
        if (stillExists) {
          await loadThread(selectedId);
        } else {
          setSelectedId(null);
          setActiveThread(null);
          setMessages([]);
        }
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "DM の更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [loadInbox, loadThread, selectedId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshAll();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [refreshAll]);

  const handleSelectThread = async (threadId: string) => {
    setError(null);
    setLoading(true);
    try {
      await loadThread(threadId);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "DM の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/dm", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ threadId: selectedId, message: draft }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "返信の送信に失敗しました"));
      }

      const body = (await res.json()) as { thread: DmThreadSummary; messages: DmMessage[] };
      setActiveThread(body.thread);
      setMessages(body.messages);
      setDraft("");
      setMessage("返信を送信しました。");
      window.dispatchEvent(new CustomEvent(DM_UPDATED_EVENT));
      requestAnimationFrame(() => scrollToBottom("smooth"));
      await refreshAll();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "返信の送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/dm", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          action: "save_settings",
          discordWebhookUrl: webhookDraft,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Webhook 設定の保存に失敗しました"));
      }

      const body = (await res.json()) as { settings: DmSettings };
      setSettings(body.settings);
      setWebhookDraft(body.settings.discordWebhookUrl);
      setMessage("Discord Webhook URL を保存しました。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "設定の保存に失敗しました");
    }
  };

  if (!remoteStorage) {
    return (
      <div className="panel p-6 text-sm leading-relaxed text-cream-muted">
        Supabase が未設定のため、運営DMは利用できません。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 md:p-8">
        <p className="section-label mb-2">Discord</p>
        <h2 className="font-display text-xl text-gold md:text-2xl">Webhook 設定</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-muted">
          会員からDMが届いたとき、設定した Discord チャンネルへ通知します。
        </p>
        <form onSubmit={handleSaveSettings} className="mt-5 space-y-3">
          <label htmlFor="discord-webhook-url" className="block text-xs text-cream-muted">
            Discord Webhook URL
          </label>
          <input
            id="discord-webhook-url"
            value={webhookDraft}
            onChange={(event) => setWebhookDraft(event.target.value)}
            className={inputClass}
            placeholder="https://discord.com/api/webhooks/..."
            autoComplete="off"
          />
          <button type="submit" className="btn-primary min-h-10 px-5 text-sm">
            Webhook を保存
          </button>
          <button
            type="button"
            disabled={!webhookDraft.trim()}
            onClick={async () => {
              setError(null);
              setMessage(null);
              try {
                const res = await fetch("/api/admin/dm", {
                  method: "POST",
                  headers: authJsonHeaders(),
                  body: JSON.stringify({
                    action: "test_webhook",
                    discordWebhookUrl: webhookDraft,
                  }),
                });
                if (!res.ok) {
                  throw new Error(await readApiError(res, "テスト通知の送信に失敗しました"));
                }
                setMessage("Discord にテスト通知を送信しました。");
              } catch (testError) {
                setError(
                  testError instanceof Error ? testError.message : "テスト通知の送信に失敗しました"
                );
              }
            }}
            className="btn-ghost min-h-10 px-5 text-sm disabled:opacity-40"
          >
            テスト通知を送る
          </button>
          {settings.discordWebhookUrl && (
            <p className="text-[11px] text-cream-faint">通知先: 設定済み（保存後すぐ反映されます）</p>
          )}
        </form>
      </div>

      <div className="panel overflow-hidden p-0 md:p-0">
        <div className="border-b border-[var(--color-border)] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-label mb-1">Inbox</p>
              <h2 className="font-display text-xl text-gold">運営DM</h2>
            </div>
            <div className="flex items-center gap-3">
              {unreadTotal > 0 && (
                <span className="dm-nav-badge" aria-label={`未読 ${unreadTotal} 件`}>
                  未読 {unreadTotal}
                </span>
              )}
              <button type="button" onClick={() => void refreshAll()} className="btn-ghost min-h-10 px-4 text-xs">
                更新
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">{DM_RETENTION_NOTICE}</p>
        </div>

        <div className="dm-admin__layout grid lg:grid-cols-[minmax(16rem,18rem)_1fr]">
          <aside className="dm-admin__threads border-b border-[var(--color-border)] lg:border-b-0 lg:border-r">
            {threads.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-cream-faint">DM はまだありません。</p>
            ) : (
              <ul className="max-h-[32rem] overflow-y-auto">
                {threads.map((thread) => {
                  const active = thread.id === selectedId;
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => void handleSelectThread(thread.id)}
                        className={`dm-admin__thread-item w-full px-4 py-4 text-left transition-colors ${
                          active ? "dm-admin__thread-item--active" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-serif-jp text-sm text-cream">{thread.userDisplayName}</p>
                          {thread.adminUnreadCount > 0 && (
                            <span className="dm-nav-badge shrink-0">{thread.adminUnreadCount}</span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-cream-faint">
                          {thread.lastMessagePreview || "（メッセージなし）"}
                        </p>
                        <p className="mt-1 text-[10px] text-cream-faint">
                          {formatDmListTimestamp(thread.lastMessageAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="dm-admin__conversation min-h-[24rem]">
            {!activeThread ? (
              <p className="flex h-full min-h-[24rem] items-center justify-center px-6 text-sm text-cream-faint">
                左の一覧から会話を選択してください。
              </p>
            ) : (
              <>
                <div className="border-b border-[var(--color-border)] px-5 py-4">
                  <p className="font-serif-jp text-base text-cream">{activeThread.userDisplayName}</p>
                  {activeThread.userEmail && (
                    <p className="mt-1 break-all text-xs text-cream-faint">{activeThread.userEmail}</p>
                  )}
                </div>

                <div
                  ref={containerRef}
                  onScroll={handleScroll}
                  className="dm-panel__messages max-h-[24rem] overflow-y-auto overscroll-contain px-3 py-4 md:px-4"
                >
                  <ul className="dm-message-list">
                    {messages.map((message) => {
                      const isAdmin = message.sender === "admin";
                      return (
                        <li
                          key={message.id}
                          className={`dm-message ${isAdmin ? "dm-message--admin" : "dm-message--user"}`}
                        >
                          <div className="dm-message__bubble">
                            <p className="dm-message__body whitespace-pre-wrap break-words">{message.body}</p>
                          </div>
                          <p className="dm-message__meta">
                            {!isAdmin && `${getDmSenderLabel(message.sender)} · `}
                            {formatDmTimestamp(message.createdAt)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <form onSubmit={handleSend} className="border-t border-[var(--color-border)] p-4 md:p-5">
                  <label htmlFor="admin-dm-reply" className="mb-1.5 block text-xs text-cream-muted">
                    返信
                  </label>
                  <textarea
                    id="admin-dm-reply"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    className={`${inputClass} min-h-[6rem] resize-y`}
                    placeholder="返信メッセージを入力…"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={sending || !draft.trim() || loading}
                      className="btn-primary min-h-10 px-5 text-sm disabled:opacity-40"
                    >
                      {sending ? "送信中…" : "返信する"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {message && (
        <p className="text-sm leading-relaxed text-cream-muted" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
