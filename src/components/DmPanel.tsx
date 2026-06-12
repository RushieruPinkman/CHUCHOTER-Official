"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DmAttachmentComposer from "@/components/DmAttachmentComposer";
import DmMessageContent from "@/components/DmMessageContent";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { isUserAuthEnabled } from "@/lib/supabase/config";
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

interface DmPanelProps {
  loginNextPath?: string;
}

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-sm text-cream focus:border-gold focus:outline-none";

export default function DmPanel({ loginNextPath = "/dm" }: DmPanelProps) {
  const { userKey, memberLabel, ready: authReady } = useCollectionUserKey();
  const devMode = isAuthDevEnabled() && !isUserAuthEnabled();
  const [thread, setThread] = useState<DmThreadSummary | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<DmAttachmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollKey = buildDmMessageScrollKey(messages, loading && messages.length === 0);
  const { containerRef, bottomSentinelRef, handleScroll, scrollToBottom } = useDmMessageListScroll(
    scrollKey,
    {
      paused: loading && messages.length === 0,
      resetKey: userKey,
    }
  );

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
      const data = await fetchUserDmThread(userKey, devMode);
      setThread(data.thread);
      setMessages(data.messages);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "DM の読み込みに失敗しました");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [devMode, userKey]);

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
    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, 30000);

    return () => {
      window.removeEventListener(DM_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [refresh, userKey]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userKey || sending || uploadingAttachment) return;
    if (!draft.trim() && !pendingAttachment) return;

    setSending(true);
    setError(null);

    try {
      const detail = await sendUserDmMessage(userKey, devMode, draft, pendingAttachment);
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

  const handleSelectAttachment = async (file: File) => {
    if (!userKey) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const attachment = await uploadUserDmAttachment(userKey, devMode, file);
      setPendingAttachment(attachment);
    } finally {
      setUploadingAttachment(false);
    }
  };

  if (!authReady) {
    return (
      <p className="py-12 text-center text-sm text-cream-faint" role="status">
        読み込み中…
      </p>
    );
  }

  if (!userKey) {
    return (
      <div className="profile-collection__empty mx-auto max-w-lg border border-[var(--color-border)] bg-deep/60 px-6 py-10 text-center">
        <p className="text-sm leading-relaxed text-cream-muted">
          運営とのDMは、ログイン中のアカウントでのみご利用いただけます。
        </p>
        <p className="mt-2 text-xs leading-relaxed text-cream-faint">{DM_RETENTION_NOTICE}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href={getAuthLoginHref(loginNextPath)} className="btn-primary inline-flex min-h-11 items-center px-6">
            ログイン
          </Link>
          <Link href={getAuthRegisterHref(loginNextPath)} className="btn-ghost inline-flex min-h-11 items-center px-6">
            新規登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-panel dm-panel--user mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <details className="dm-panel__notice mb-3 border border-[var(--color-border)] bg-deep/60 px-3 py-2.5 text-xs leading-relaxed text-cream-faint md:mb-5 md:hidden">
        <summary className="cursor-pointer list-none text-center marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-cream-muted">ご利用上の注意</span>
        </summary>
        <div className="mt-2 border-t border-[var(--color-border)] pt-2 text-center">
          <p>{DM_RETENTION_NOTICE}</p>
        </div>
      </details>

      <div className="dm-panel__notice mb-4 hidden border border-[var(--color-border)] bg-deep/60 px-4 py-3 text-center text-xs leading-relaxed text-cream-faint md:mb-5 md:block">
        {memberLabel && <span className="block text-cream-muted">{memberLabel} として送信されます。</span>}
        <span className="mt-1 block">{DM_RETENTION_NOTICE}</span>
      </div>

      <div className="dm-panel__chat flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--color-border)] bg-deep/70">
        {memberLabel && (
          <div className="dm-panel__chat-header shrink-0 border-b border-[var(--color-border)] px-3 py-2.5 md:hidden">
            <p className="truncate text-center text-xs text-cream-muted">{memberLabel}</p>
          </div>
        )}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="dm-panel__messages dm-panel__messages--user min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 md:max-h-[28rem] md:flex-none md:px-4 md:py-4"
        >
          {loading && messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-cream-faint" role="status">
              読み込み中…
            </p>
          ) : messages.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-cream-muted">まだメッセージはありません。</p>
              <p className="mt-2 text-xs leading-relaxed text-cream-faint">
                当選報告・お問い合わせなど、運営への連絡はこちらからどうぞ。
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
                      <div className="dm-message__bubble min-w-0 max-w-full overflow-hidden">
                        <DmMessageContent
                          message={message}
                          downloadHeaders={buildDmUploadHeaders(userKey, devMode)}
                        />
                      </div>
                      <p className="dm-message__meta">
                        {!isUser && `${getDmSenderLabel(message.sender)} · `}
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
          className="dm-panel__composer relative z-[2] shrink-0 border-t border-[var(--color-border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-5 md:pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <label htmlFor="dm-message" className="mb-1.5 hidden text-xs text-cream-muted md:block">
            メッセージ
          </label>
          <textarea
            id="dm-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            className={`${inputClass} min-h-[4.75rem] resize-none md:min-h-[6rem] md:resize-y`}
            placeholder="運営へのメッセージ…（画像・音声も添付可）"
          />

          <DmAttachmentComposer
            compact
            disabled={sending}
            uploading={uploadingAttachment}
            pendingAttachment={pendingAttachment}
            onSelectFile={handleSelectAttachment}
            onClear={() => setPendingAttachment(null)}
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            {error && (
              <p className="order-3 w-full text-sm leading-relaxed text-red-300 sm:order-3" role="alert">
                {error}
              </p>
            )}
            <p className="order-2 text-center text-[11px] text-cream-faint sm:order-1 sm:text-left">
              {draft.length}/2000
            </p>
            <button
              type="submit"
              disabled={sending || uploadingAttachment || (!draft.trim() && !pendingAttachment)}
              className="btn-primary order-1 min-h-11 w-full touch-manipulation px-6 disabled:opacity-40 sm:order-2 sm:w-auto"
            >
              {sending ? "送信中…" : "送信する"}
            </button>
          </div>
        </form>
      </div>

      {thread && (
        <p className="mt-2 hidden text-center text-[11px] text-cream-faint md:mt-3 md:block" role="status">
          最終更新: {formatDmTimestamp(thread.lastMessageAt)}
        </p>
      )}
    </div>
  );
}
