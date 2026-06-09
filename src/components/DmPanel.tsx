"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { isUserAuthEnabled } from "@/lib/supabase/config";
import {
  DM_RETENTION_NOTICE,
  formatDmTimestamp,
  getDmSenderLabel,
  type DmMessage,
  type DmThreadSummary,
} from "@/lib/dm";
import { fetchUserDmThread, sendUserDmMessage } from "@/lib/dm-client";
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
  const [error, setError] = useState<string | null>(null);
  const scrollKey = buildDmMessageScrollKey(messages, loading);
  const { containerRef, handleScroll, scrollToBottom } = useDmMessageListScroll(scrollKey, {
    paused: loading,
    resetKey: userKey,
  });

  const refresh = useCallback(async () => {
    if (!userKey) {
      setThread(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchUserDmThread(userKey, devMode);
      setThread(data.thread);
      setMessages(data.messages);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "DM の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [devMode, userKey]);

  useEffect(() => {
    if (!authReady) return;
    void refresh();
  }, [authReady, refresh]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userKey || !draft.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const detail = await sendUserDmMessage(userKey, devMode, draft);
      setThread(detail.thread);
      setMessages(detail.messages);
      setDraft("");
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "DM の送信に失敗しました");
    } finally {
      setSending(false);
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
    <div className="dm-panel mx-auto max-w-2xl">
      <div className="dm-panel__notice mb-5 border border-[var(--color-border)] bg-deep/60 px-4 py-3 text-center text-xs leading-relaxed text-cream-faint">
        {memberLabel && <span className="block text-cream-muted">{memberLabel} として送信されます。</span>}
        <span className="mt-1 block">{DM_RETENTION_NOTICE}</span>
      </div>

      <div className="dm-panel__chat border border-[var(--color-border)] bg-deep/70">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="dm-panel__messages max-h-[28rem] overflow-y-auto overscroll-contain px-3 py-4 md:px-4"
        >
          {loading ? (
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
            <ul className="dm-message-list">
              {messages.map((message) => {
                const isUser = message.sender === "user";
                return (
                  <li
                    key={message.id}
                    className={`dm-message ${isUser ? "dm-message--user" : "dm-message--admin"}`}
                  >
                    <div className="dm-message__bubble">
                      <p className="dm-message__body whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                    <p className="dm-message__meta">
                      {!isUser && `${getDmSenderLabel(message.sender)} · `}
                      {formatDmTimestamp(message.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={handleSend} className="border-t border-[var(--color-border)] p-4 md:p-5">
          <label htmlFor="dm-message" className="mb-1.5 block text-xs text-cream-muted">
            メッセージ
          </label>
          <textarea
            id="dm-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={2000}
            className={`${inputClass} min-h-[6rem] resize-y`}
            placeholder="運営へのメッセージを入力…"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-cream-faint">{draft.length}/2000</p>
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary min-h-11 px-6 disabled:opacity-40">
              {sending ? "送信中…" : "送信する"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}

      {thread && (
        <p className="mt-3 text-center text-[11px] text-cream-faint" role="status">
          最終更新: {formatDmTimestamp(thread.lastMessageAt)}
        </p>
      )}
    </div>
  );
}
