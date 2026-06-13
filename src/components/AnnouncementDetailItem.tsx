"use client";

import { useEffect, useRef } from "react";
import { formatAnnouncementDate } from "@/lib/site";
import type { Announcement } from "@/types";

/** この文字数を超える本文は折りたたみ表示 */
export const ANNOUNCEMENT_COLLAPSE_MIN_LENGTH = 100;

interface AnnouncementDetailItemProps {
  item: Announcement;
}

export default function AnnouncementDetailItem({ item }: AnnouncementDetailItemProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const body = item.body.trim();
  const collapsible = body.length > ANNOUNCEMENT_COLLAPSE_MIN_LENGTH;

  useEffect(() => {
    if (window.location.hash !== `#announcement-${item.id}`) return;
    detailsRef.current?.setAttribute("open", "");
  }, [item.id]);

  return (
    <article id={`announcement-${item.id}`} className="panel scroll-mt-28 p-5 md:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <time dateTime={item.publishedAt} className="text-[11px] tracking-[0.12em] text-cream-faint">
          {formatAnnouncementDate(item.publishedAt)}
        </time>
        {item.pinned && (
          <span className="border border-gold/30 bg-gold/[0.06] px-2 py-0.5 text-[10px] tracking-widest text-gold">
            PIN
          </span>
        )}
      </div>
      <h3 className="mb-3 text-lg text-cream md:text-xl" style={{ fontFamily: "var(--font-serif-jp)" }}>
        {item.title}
      </h3>

      {collapsible ? (
        <details ref={detailsRef} className="announcement-details">
          <summary className="announcement-details__summary">詳細を表示</summary>
          <div className="announcement-details__body">
            <p className="whitespace-pre-wrap text-sm leading-[1.9] text-cream-muted">{body}</p>
          </div>
        </details>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-[1.9] text-cream-muted">{body}</p>
      )}
    </article>
  );
}
