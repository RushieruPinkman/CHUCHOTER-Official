import ScrollReveal from "@/components/ScrollReveal";
import type { Announcement } from "@/types";

interface AnnouncementListProps {
  items: Announcement[];
}

export default function AnnouncementList({ items }: AnnouncementListProps) {
  if (items.length === 0) return null;

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
              <ScrollReveal delay={index * 0.06} className="panel p-5 md:p-6">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <time dateTime={item.publishedAt} className="text-[11px] tracking-[0.15em] text-cream-faint">
                    {item.publishedAt}
                  </time>
                  {item.pinned && (
                    <span className="border border-gold/30 bg-gold/[0.06] px-2 py-0.5 text-[10px] tracking-widest text-gold">
                      PIN
                    </span>
                  )}
                </div>
                <h3 className="mb-2 text-lg text-cream" style={{ fontFamily: "var(--font-serif-jp)" }}>
                  {item.title}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-[1.9] text-cream-muted">{item.body}</p>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
