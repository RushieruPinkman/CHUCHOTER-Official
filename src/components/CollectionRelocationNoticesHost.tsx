"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatCollectionRelocationMessage,
  type CollectionRelocationNotice,
} from "@/lib/cast-collection-redistribution";
import {
  dismissCollectionRelocationNoticeClient,
  fetchPendingCollectionRelocationNotices,
} from "@/lib/gacha-collection-notices-client";
import { isRemoteCollectionUserKey } from "@/lib/gacha-collection-client";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

interface CollectionRelocationNoticeModalProps {
  notice: CollectionRelocationNotice;
  pending?: boolean;
  onDismiss: () => void;
}

function CollectionRelocationNoticeModal({
  notice,
  pending = false,
  onDismiss,
}: CollectionRelocationNoticeModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    lockBodyScroll();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onDismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, onDismiss, pending]);

  if (!mounted) return null;

  const message = formatCollectionRelocationMessage(notice);

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-relocation-title"
      aria-describedby="collection-relocation-message"
      onClick={pending ? undefined : onDismiss}
    >
      <div className="panel w-full max-w-md overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[var(--color-border)] px-5 py-4 md:px-6">
          <p className="section-label mb-0">Collection</p>
          <h2 id="collection-relocation-title" className="font-display text-lg text-gold md:text-xl">
            お引越しのお知らせ
          </h2>
        </div>
        <div className="px-5 py-5 md:px-6">
          <p
            id="collection-relocation-message"
            className="whitespace-pre-line text-sm leading-relaxed text-cream-muted"
          >
            {message}
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              disabled={pending}
              className="btn-primary min-h-11 px-6 disabled:opacity-40"
            >
              {pending ? "処理中…" : "確認しました"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface CollectionRelocationNoticesHostProps {
  userKey: string;
  synced: boolean;
}

export default function CollectionRelocationNoticesHost({
  userKey,
  synced,
}: CollectionRelocationNoticesHostProps) {
  const [notices, setNotices] = useState<CollectionRelocationNotice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!synced || !isRemoteCollectionUserKey(userKey)) {
      setNotices([]);
      setCurrentIndex(0);
      return;
    }

    let cancelled = false;

    void fetchPendingCollectionRelocationNotices()
      .then((pending) => {
        if (!cancelled) {
          setNotices(pending);
          setCurrentIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotices([]);
          setCurrentIndex(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [synced, userKey]);

  const currentNotice = notices[currentIndex] ?? null;

  const handleDismiss = useCallback(async () => {
    if (!currentNotice || dismissing) return;

    setDismissing(true);
    try {
      await dismissCollectionRelocationNoticeClient(currentNotice.id);
      if (currentIndex < notices.length - 1) {
        setCurrentIndex((index) => index + 1);
      } else {
        setNotices([]);
        setCurrentIndex(0);
      }
    } catch {
      /* 次回表示時に再試行 */
    } finally {
      setDismissing(false);
    }
  }, [currentIndex, currentNotice, dismissing, notices.length]);

  if (!currentNotice) return null;

  return (
    <CollectionRelocationNoticeModal
      notice={currentNotice}
      pending={dismissing}
      onDismiss={() => {
        void handleDismiss();
      }}
    />
  );
}
