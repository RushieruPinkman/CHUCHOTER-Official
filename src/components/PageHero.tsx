import ScrollReveal from "@/components/ScrollReveal";

interface PageHeroProps {
  titleEn: string;
  titleJa: string;
  description: string;
  /** モバイルで説明文を非表示にし、余白を詰める（チャット画面向け） */
  compact?: boolean;
}

export default function PageHero({ titleEn, titleJa, description, compact = false }: PageHeroProps) {
  return (
    <section
      className={`site-header-offset relative overflow-hidden ${
        compact ? "pb-4 md:pb-12" : "pb-10 md:pb-12"
      } ${compact ? "page-hero--compact" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(201,169,98,0.06),transparent)]"
        aria-hidden="true"
      />
      <div className="site-container relative">
        <ScrollReveal immediate>
          <span className="section-label">{titleEn}</span>
          <h1 className={`section-title max-w-3xl ${compact ? "mb-0 md:mb-4" : "mb-4"}`}>{titleJa}</h1>
          <p
            className={`max-w-3xl text-[15px] leading-[1.85] text-cream-muted md:text-base ${
              compact ? "mt-3 hidden md:block" : ""
            }`}
          >
            {description}
          </p>
        </ScrollReveal>
        <ScrollReveal immediate delay={0.12}>
          <div className={`hairline ${compact ? "mt-4 md:mt-8" : "mt-8"}`} />
        </ScrollReveal>
      </div>
    </section>
  );
}
