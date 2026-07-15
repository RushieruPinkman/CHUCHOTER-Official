"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DmAttachmentComposer from "@/components/DmAttachmentComposer";
import DmMessageContent from "@/components/DmMessageContent";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import {
  DM_RETENTION_NOTICE,
  formatDmTimestamp,
  getDmSenderLabel,
  type DmAttachmentPayload,
  type DmMessage,
  type DmThreadSummary,
} from "@/lib/dm";
import {
  fetchUserDmThread,
  sendUserDmMessage,
  uploadUserDmAttachment,
  buildDmUploadHeaders,
  DM_UPDATED_EVENT,
} from "@/lib/dm-client";
import {
  buildDmMessageScrollKey,
  useDmMessageListScroll,
} from "@/hooks/useDmMessageListScroll";
import { PANEL_POLL_MS, startVisibilityAwarePoll } from "@/lib/visibility-poll";

interface DmPanelProps {
  loginNextPath?: string;
}

export default function DmPanel({ loginNextPath = "/dm" }: DmPanelProps) {
  const { userKey, memberLabel, ready: authReady } = useCollectionUserKey();
  const [thread, setThread] = useState<DmThreadSummary | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<DmAttachmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollKey = buildDmMessageScrollKey(messages, loading && messages.length === 0);
  const { containerRef, bottomSentinelRef, handleScroll, scrollToBottom } = useDmMessageListScroll(
    scrollKey,
    {
      paused: loading && messages.length === 0,
      resetKey: userKey,
    }
  );

  const canSend =
    Boolean(userKey) &&
    !sending &&
    !uploadingAttachment &&
    (draft.trim().length > 0 || pendingAttachment !== null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!userKey) {
      setThread(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchUserDmThread(userKey);
      setThread(data.thread);
      setMessages(data.messages);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "DM の読み込みに失敗しました");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [userKey]);

  useEffect(() => {
    if (!authReady) return;
    void refresh();
  }, [authReady, refresh]);

  useEffect(() => {
    if (!userKey) return;

    const onUpdated = () => {
      void refresh({ silent: true });
    };

    window.addEventListener(DM_UPDATED_EVENT, onUpdated);
    const stopPoll = startVisibilityAwarePoll(() => {
      void refresh({ silent: true });
    }, PANEL_POLL_MS);

    return () => {
      window.removeEventListener(DM_UPDATED_EVENT, onUpdated);
      stopPoll();
    };
  }, [refresh, userKey]);

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!canSend || !userKey) return;

    setSending(true);
    setError(null);

    try {
      const detail = await sendUserDmMessage(userKey, draft, pendingAttachment);
      setThread(detail.thread);
      setMessages(detail.messages);
      setDraft("");
      setPendingAttachment(null);
      requestAnimationFrame(() => scrollToBottom("auto", true));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "DM の送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!canSend) return;
    void handleSend();
  };

  const handleSelectAttachment = async (file: File) => {
    if (!userKey) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const attachment = await uploadUserDmAttachment(userKey, file);
      setPendingAttachment(attachment);
      textareaRef.current?.focus();
    } finally {
      setUploadingAttachment(false);
    }
  };

  if (!authReady) {
    return (
      <div className="dm-panel__state" role="status">
        <p className="text-sm text-cream-faint">読み込み中…</p>
      </div>
    );
  }

  if (!userKey) {
    return (
      <div className="dm-panel__gate mx-auto w-full max-w-md">
        <div className="dm-panel__gate-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="dm-panel__gate-title">ログインが必要です</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-muted">
          運営とのDMは、ログイン中のアカウントでのみご利用いただけます。
        </p>
        <details className="dm-panel__notice mt-4 text-left">
          <summary>ご利用上の注意</summary>
          <p className="mt-2">{DM_RETENTION_NOTICE}</p>
        </details>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={getAuthLoginHref(loginNextPath)} className="btn-primary inline-flex min-h-11 items-center justify-center px-6">
            ログイン
          </Link>
          <Link href={getAuthRegisterHref(loginNextPath)} className="btn-ghost inline-flex min-h-11 items-center justify-center px-6">
            新規登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-panel dm-panel--user mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <details className="dm-panel__notice">
        <summary>ご利用上の注意</summary>
        <div className="dm-panel__notice-body">
          {memberLabel && <p className="text-cream-muted">{memberLabel} として送信されます。</p>}
          <p>{DM_RETENTION_NOTICE}</p>
          <p className="text-[10px] text-cream-faint">
            画像 5MB まで / 音声 10MB まで。Enter で送信、Shift+Enter で改行。
          </p>
        </div>
      </details>

      <div className="dm-panel__chat flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="dm-panel__chat-header shrink-0">
          <div className="min-w-0">
            <p className="dm-panel__chat-label">Contact</p>
            <h2 className="dm-panel__chat-title">運営DM</h2>
          </div>
          <div className="dm-panel__chat-meta">
            {memberLabel && <span className="dm-panel__member-badge">{memberLabel}</span>}
            {thread && (
              <span className="dm-panel__updated hidden md:inline">
                更新 {formatDmTimestamp(thread.lastMessageAt)}
              </span>
            )}
          </div>
        </header>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="dm-panel__messages dm-panel__messages--user min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          aria-live="polite"
          aria-relevant="additions"
        >
          {loading && messages.length === 0 ? (
            <div className="dm-panel__state" role="status">
              <p className="text-sm text-cream-faint">読み込み中…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="dm-panel__empty">
              <div className="dm-panel__empty-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm text-cream">まだメッセージはありません</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-cream-faint">
                当選報告・お問い合わせなど、運営への連絡は下の入力欄からどうぞ。
              </p>
            </div>
          ) : (
            <>
              <ul className="dm-message-list">
                {messages.map((message) => {
                  const isUser = message.sender === "user";
                  return (
                    <li
                      key={message.id}
                      className={`dm-message ${isUser ? "dm-message--user" : "dm-message--admin"}`}
                    >
                      {!isUser && (
                        <p className="dm-message__sender">{getDmSenderLabel(message.sender)}</p>
                      )}
                      <div className="dm-message__bubble min-w-0 max-w-full overflow-hidden">
                        <DmMessageContent
                          message={message}
                          downloadHeaders={buildDmUploadHeaders(userKey)}
                        />
                      </div>
                      <p className="dm-message__meta">{formatDmTimestamp(message.createdAt)}</p>
                    </li>
                  );
                })}
              </ul>
              <div ref={bottomSentinelRef} className="dm-panel__scroll-sentinel" aria-hidden="true" />
            </>
          )}
        </div>

        <form
          onSubmit={(event) => void handleSend(event)}
          className="dm-panel__composer dm-composer"
        >
          {pendingAttachment && (
            <div className="dm-composer__pending">
              <span className="dm-composer__pending-label">
                添付: {pendingAttachment.name}
                <span className="text-cream-faint">
                  {" "}
                  （{pendingAttachment.type === "image" ? "画像" : "音声"}）
                </span>
              </span>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="dm-composer__pending-clear"
                aria-label="添付を解除"
              >
                ×
              </button>
            </div>
          )}

          <div className="dm-composer__toolbar">
            <DmAttachmentComposer
              variant="toolbar"
              disabled={sending}
              uploading={uploadingAttachment}
              pendingAttachment={pendingAttachment}
              onSelectFile={handleSelectAttachment}
              onClear={() => setPendingAttachment(null)}
            />
            <label htmlFor="dm-message" className="sr-only">
              メッセージ
            </label>
            <textarea
              ref={textareaRef}
              id="dm-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              maxLength={2000}
              className="dm-composer__input"
              placeholder="メッセージを入力…"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="dm-composer__send btn-primary touch-manipulation"
              aria-label={sending ? "送信中" : "送信する"}
            >
              {sending ? "…" : "送信"}
            </button>
          </div>

          <div className="dm-composer__footer">
            {error ? (
              <p className="dm-composer__error" role="alert">
                {error}
              </p>
            ) : (
              <span className="dm-composer__hint">Shift+Enter で改行</span>
            )}
            <span className="dm-composer__count">{draft.length}/2000</span>
          </div>
        </form>
      </div>
    </div>
  );
}
