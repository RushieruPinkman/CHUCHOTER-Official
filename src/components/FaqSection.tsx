interface FaqSectionProps {
  id?: string;
  title?: string;
  items: { question: string; answer: string }[];
}

/** 構造化データ（FAQPage）と同一内容をページ上に表示する */
export default function FaqSection({
  id = "faq",
  title = "よくある質問",
  items,
}: FaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="section-py border-t border-[var(--color-border)]"
      aria-labelledby={`${id}-heading`}
    >
      <div className="site-container">
        <h2 id={`${id}-heading`} className="section-title mb-5">
          {title}
        </h2>
        <dl className="mx-auto max-w-3xl space-y-3">
          {items.map((item) => (
            <div key={item.question} className="panel p-5 md:p-6">
              <dt
                className="text-base text-cream"
                style={{ fontFamily: "var(--font-serif-jp)" }}
              >
                {item.question}
              </dt>
              <dd className="mt-2 text-sm leading-[1.9] text-cream-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
