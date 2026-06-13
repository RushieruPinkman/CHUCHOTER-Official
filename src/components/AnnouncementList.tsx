import Link from "next/link";
import AnnouncementDetailItem from "@/components/AnnouncementDetailItem";
import ScrollReveal from "@/components/ScrollReveal";
import { formatAnnouncementDate } from "@/lib/site";
import type { Announcement } from "@/types";

interface AnnouncementListProps {
  items: Announcement[];
  /** compact: TOP用（日付・タイトルのみ） / detail: ご案内用（本文あり） */
  variant?: "compact" | "detail";
}

export default function AnnouncementList({ items, variant = "detail" }: AnnouncementListProps) {
  if (items.length === 0) return null;

  if (variant === "compact") {
    return (
      <section className="section-py-tight border-b border-[var(--color-border)]" aria-labelledby="news-heading">
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">News</span>
            <h2 id="news-heading" className="section-title mb-6">
              お知らせ
            </h2>
          </ScrollReveal>
          <ul className="space-y-px">
            {items.map((item, index) => (
              <li key={item.id}>
                <ScrollReveal delay={index * 0.06}>
                  <Link
                    href={`/system#announcement-${item.id}`}
                    className="panel panel-hover flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 md:px-6"
                  >
                    <time dateTime={item.publishedAt} className="shrink-0 text-[11px] tracking-[0.12em] text-cream-faint">
                      {formatAnnouncementDate(item.publishedAt)}
                    </time>
                    <span className="min-w-0 flex-1 text-sm text-cream md:text-[15px]" style={{ fontFamily: "var(--font-serif-jp)" }}>
                      {item.title}
                    </span>
                    {item.pinned && (
                      <span className="border border-gold/30 bg-gold/[0.06] px-2 py-0.5 text-[10px] tracking-widest text-gold">
                        PIN
                      </span>
                    )}
                    <span className="text-[11px] tracking-[0.15em] text-gold">詳細 →</span>
                  </Link>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section
      id="announcements"
      className="section-py-tight border-b border-[var(--color-border)]"
      aria-labelledby="announcements-heading"
    >
      <div className="site-container">
        <ScrollReveal>
          <span className="section-label">News</span>
          <h2 id="announcements-heading" className="section-title mb-6">
            お知らせ
          </h2>
        </ScrollReveal>
        <ul className="space-y-px">
          {items.map((item, index) => (
            <li key={item.id}>
              <ScrollReveal delay={index * 0.06}>
                <AnnouncementDetailItem item={item} />
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
