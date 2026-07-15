"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";
import {
  DM_RETENTION_NOTICE,
  formatDmListTimestamp,
  formatDmTimestamp,
  getDmSenderLabel,
  type DmAttachmentPayload,
  type DmMessage,
  type DmSettings,
  type DmThreadSummary,
} from "@/lib/dm";
import { DM_UPDATED_EVENT } from "@/lib/dm-client";
import DmAttachmentComposer from "@/components/DmAttachmentComposer";
import DmMessageContent from "@/components/DmMessageContent";
import {
  buildDmMessageScrollKey,
  useDmMessageListScroll,
} from "@/hooks/useDmMessageListScroll";
import { PANEL_POLL_MS, startVisibilityAwarePoll } from "@/lib/visibility-poll";

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
  const [inboxLoading, setInboxLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<DmAttachmentPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const loadingThreadIdRef = useRef<string | null>(null);
  const loadThreadRequestRef = useRef(0);
  const scrollKey = buildDmMessageScrollKey(messages, threadLoading && messages.length === 0);
  const { containerRef, bottomSentinelRef, handleScroll, scrollToBottom } = useDmMessageListScroll(
    scrollKey,
    {
      paused: threadLoading && messages.length === 0,
      resetKey: selectedId,
    }
  );

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

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadThread = useCallback(
    async (threadId: string, options?: { poll?: boolean }) => {
      const requestId = ++loadThreadRequestRef.current;
      const poll = options?.poll ? "&poll=1" : "";
      const res = await fetch(`/api/admin/dm?threadId=${encodeURIComponent(threadId)}${poll}`, {
        headers: authJsonHeaders(),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "DM の取得に失敗しました"));
      }

      if (requestId !== loadThreadRequestRef.current) {
        return;
      }

      const body = (await res.json()) as { thread: DmThreadSummary; messages: DmMessage[] };
      setActiveThread(body.thread);
      setMessages(body.messages);
      setSelectedId(threadId);
      selectedIdRef.current = threadId;
      setThreads((current) =>
        current.map((thread) => (thread.id === threadId ? body.thread : thread))
      );
    },
    [authJsonHeaders]
  );

  const refreshAll = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (silent) {
        setRefreshing(true);
      } else {
        setInboxLoading(true);
      }
      setError(null);
      try {
        const nextThreads = await loadInbox();
        const activeId = selectedIdRef.current;
        if (activeId) {
          const stillExists = nextThreads.some((thread) => thread.id === activeId);
          if (stillExists) {
            await loadThread(activeId, { poll: silent });
          } else if (selectedIdRef.current === activeId) {
            setSelectedId(null);
            selectedIdRef.current = null;
            setActiveThread(null);
            setMessages([]);
            setMobileChatOpen(false);
          }
        }
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "DM の更新に失敗しました");
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setInboxLoading(false);
        }
      }
    },
    [loadInbox, loadThread]
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const stopPoll = startVisibilityAwarePoll(() => {
      void refreshAll({ silent: true });
    }, PANEL_POLL_MS);
    return () => stopPoll();
  }, [refreshAll]);

  const handleSelectThread = (threadId: string) => {
    const summary = threads.find((thread) => thread.id === threadId);
    if (!summary) return;

    setError(null);
    setPendingAttachment(null);
    setDraft("");
    setSelectedId(threadId);
    selectedIdRef.current = threadId;
    setActiveThread(summary);
    setMessages([]);
    setMobileChatOpen(true);
    loadingThreadIdRef.current = threadId;
    setThreadLoading(true);

    void loadThread(threadId)
      .catch((selectError) => {
        setError(selectError instanceof Error ? selectError.message : "DM の取得に失敗しました");
      })
      .finally(() => {
        if (loadingThreadIdRef.current === threadId) {
          setThreadLoading(false);
        }
      });
  };

  const handleBackToList = () => {
    setMobileChatOpen(false);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || sending || uploadingAttachment) return;
    if (!draft.trim() && !pendingAttachment) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/dm", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          threadId: selectedId,
          message: draft,
          attachment: pendingAttachment,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "返信の送信に失敗しました"));
      }

      const body = (await res.json()) as { thread: DmThreadSummary; messages: DmMessage[] };
      setActiveThread(body.thread);
      setMessages(body.messages);
      setDraft("");
      setPendingAttachment(null);
      setMessage("返信を送信しました。");
      window.dispatchEvent(new CustomEvent(DM_UPDATED_EVENT));
      requestAnimationFrame(() => scrollToBottom("auto", true));
      await refreshAll({ silent: true });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "返信の送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleSelectAttachment = async (file: File) => {
    if (!selectedId) return;

    setUploadingAttachment(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
      formData.append("threadId", selectedId);

      const authHeaders = authJsonHeaders() as Record<string, string>;
      const res = await fetch("/api/admin/dm/upload", {
        method: "POST",
        headers: { Authorization: authHeaders.Authorization },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "添付ファイルのアップロードに失敗しました"));
      }

      const body = (await res.json()) as { attachment: DmAttachmentPayload };
      setPendingAttachment(body.attachment);
    } finally {
      setUploadingAttachment(false);
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
        <div
          className={`border-b border-[var(--color-border)] px-5 py-4 md:px-6 ${
            mobileChatOpen ? "hidden lg:block" : "block"
          }`}
        >
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

        <div
          className={`dm-admin__layout grid lg:grid-cols-[minmax(16rem,18rem)_1fr] ${
            mobileChatOpen ? "dm-admin__layout--chat-open" : ""
          }`}
        >
          <aside
            className={`dm-admin__threads border-b border-[var(--color-border)] lg:border-b-0 lg:border-r ${
              mobileChatOpen ? "hidden lg:block" : "block"
            }`}
          >
            {inboxLoading && threads.length === 0 ? (
              <div className="dm-panel__state" role="status">
                <p className="text-sm text-cream-faint">一覧を読み込み中…</p>
              </div>
            ) : threads.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-cream-faint">DM はまだありません。</p>
            ) : (
              <ul className="dm-admin__thread-list lg:max-h-[32rem] lg:overflow-y-auto">
                {threads.map((thread) => {
                  const active = thread.id === selectedId;
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectThread(thread.id)}
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

          <section
            className={`dm-admin__conversation min-h-[24rem] flex-col ${
              selectedId ? (mobileChatOpen ? "flex" : "hidden lg:flex") : "hidden lg:flex"
            }`}
          >
            {!selectedId ? (
              <p className="hidden h-full min-h-[24rem] items-center justify-center px-6 text-sm text-cream-faint lg:flex">
                左の一覧から会話を選択してください。
              </p>
            ) : (
              <>
                <div className="dm-admin__conversation-header border-b border-[var(--color-border)] px-4 py-3 md:px-5 md:py-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="dm-admin__back-btn btn-ghost shrink-0 px-3 py-2 text-xs lg:hidden"
                      aria-label="ユーザー一覧に戻る"
                    >
                      ← 一覧
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif-jp text-base text-cream">
                        {activeThread?.userDisplayName}
                      </p>
                      {activeThread?.userEmail && (
                        <p className="mt-1 break-all text-xs text-cream-faint">{activeThread.userEmail}</p>
                      )}
                    </div>
                    {threadLoading && (
                      <span className="shrink-0 text-[10px] tracking-[0.08em] text-cream-faint">
                        読み込み中…
                      </span>
                    )}
                  </div>
                </div>

                <div
                  ref={containerRef}
                  onScroll={handleScroll}
                  className="dm-panel__messages dm-panel__messages--fill min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:max-h-[24rem] md:flex-none md:px-4"
                  aria-busy={threadLoading}
                >
                  {threadLoading ? (
                    <div className="dm-admin__thread-loading dm-panel__state" role="status">
                      <span className="dm-composer__attach-spinner" aria-hidden="true" />
                      <p className="mt-3 text-sm text-cream-muted">メッセージを読み込み中…</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="dm-panel__state">
                      <p className="text-sm text-cream-faint">メッセージはまだありません。</p>
                    </div>
                  ) : (
                    <>
                      <ul className="dm-message-list">
                        {messages.map((message) => {
                          const isAdmin = message.sender === "admin";
                          return (
                            <li
                              key={message.id}
                              className={`dm-message ${isAdmin ? "dm-message--admin" : "dm-message--user"}`}
                            >
                              <div className="dm-message__bubble">
                                <DmMessageContent
                                  message={message}
                                  downloadHeaders={{
                                    Authorization: (authJsonHeaders() as Record<string, string>).Authorization,
                                  }}
                                />
                              </div>
                              <p className="dm-message__meta">
                                {!isAdmin && `${getDmSenderLabel(message.sender)} · `}
                                {formatDmTimestamp(message.createdAt)}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                      <div ref={bottomSentinelRef} className="dm-panel__scroll-sentinel" aria-hidden="true" />
                    </>
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="dm-admin__reply-form shrink-0 border-t border-[var(--color-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-5"
                >
                  <label htmlFor="admin-dm-reply" className="mb-1.5 block text-xs text-cream-muted">
                    返信
                  </label>
                  <textarea
                    id="admin-dm-reply"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    disabled={threadLoading}
                    className={`${inputClass} min-h-[6rem] resize-y disabled:opacity-50`}
                    placeholder="返信メッセージを入力…（画像・音声も添付できます）"
                  />

                  <DmAttachmentComposer
                    disabled={sending || !selectedId || threadLoading}
                    uploading={uploadingAttachment}
                    pendingAttachment={pendingAttachment}
                    onSelectFile={handleSelectAttachment}
                    onClear={() => setPendingAttachment(null)}
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        sending ||
                        uploadingAttachment ||
                        !selectedId ||
                        threadLoading ||
                        refreshing ||
                        (!draft.trim() && !pendingAttachment)
                      }
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
