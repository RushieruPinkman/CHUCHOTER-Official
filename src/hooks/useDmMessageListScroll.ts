"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseDmMessageListScrollOptions {
  /** 読み込み中は自動スクロールしない */
  paused?: boolean;
  /** スレッド切替時に下追従をリセット */
  resetKey?: string | null;
}

export function useDmMessageListScroll(
  lastMessageKey: string | null,
  { paused = false, resetKey = null }: UseDmMessageListScrollOptions = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevMessageKeyRef = useRef<string | null>(null);
  const userPinnedRef = useRef(false);

  useEffect(() => {
    stickToBottomRef.current = true;
    userPinnedRef.current = false;
    prevMessageKeyRef.current = null;
  }, [resetKey]);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return stickToBottomRef.current;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 48;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto", force = false) => {
    if (force) {
      userPinnedRef.current = false;
      stickToBottomRef.current = true;
    }

    const container = containerRef.current;
    if (!container) return;

    const pageScrollY = window.scrollY;
    const pageScrollX = window.scrollX;

    if (behavior === "auto") {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }

    // ネストした scrollTo がページ全体を動かすブラウザ対策
    if (window.scrollY !== pageScrollY || window.scrollX !== pageScrollX) {
      window.scrollTo(pageScrollX, pageScrollY);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();
    stickToBottomRef.current = nearBottom;
    userPinnedRef.current = !nearBottom;
  }, [isNearBottom]);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = bottomSentinelRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          stickToBottomRef.current = true;
          userPinnedRef.current = false;
        } else if (container.scrollHeight > container.clientHeight + 8) {
          stickToBottomRef.current = false;
          userPinnedRef.current = true;
        }
      },
      {
        root: container,
        threshold: 0,
        rootMargin: "0px 0px 24px 0px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [lastMessageKey, resetKey, paused]);

  useEffect(() => {
    if (paused || !lastMessageKey) return;

    const isInitial = prevMessageKeyRef.current === null;
    const messageChanged = prevMessageKeyRef.current !== lastMessageKey;
    prevMessageKeyRef.current = lastMessageKey;

    if (!messageChanged) return;

    const shouldStick =
      isInitial || (!userPinnedRef.current && (stickToBottomRef.current || isNearBottom()));

    if (!shouldStick) return;

    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [isNearBottom, lastMessageKey, paused, scrollToBottom]);

  return {
    containerRef,
    bottomSentinelRef,
    handleScroll,
    scrollToBottom,
  };
}

export function buildDmMessageScrollKey(
  messages: { id: string }[],
  loading: boolean
): string | null {
  if (loading || messages.length === 0) return null;
  const last = messages[messages.length - 1];
  return `${messages.length}:${last?.id ?? ""}`;
}
