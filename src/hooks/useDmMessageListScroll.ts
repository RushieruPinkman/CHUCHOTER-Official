"use client";

import { useCallback, useEffect, useRef } from "react";

const STICKY_BOTTOM_THRESHOLD_PX = 96;

interface UseDmMessageListScrollOptions {
  /** 読み込み中はスクロールしない */
  paused?: boolean;
}

export function useDmMessageListScroll(
  lastMessageKey: string | null,
  { paused = false, resetKey }: UseDmMessageListScrollOptions & { resetKey?: string | null } = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevMessageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    stickToBottomRef.current = true;
    prevMessageKeyRef.current = null;
  }, [resetKey]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    if (paused || !lastMessageKey) return;

    const isInitial = prevMessageKeyRef.current === null;
    const messageChanged = prevMessageKeyRef.current !== lastMessageKey;
    prevMessageKeyRef.current = lastMessageKey;

    if (!messageChanged) return;

    if (isInitial || stickToBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(isInitial ? "auto" : "smooth");
      });
    }
  }, [lastMessageKey, paused, scrollToBottom]);

  return {
    containerRef,
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
