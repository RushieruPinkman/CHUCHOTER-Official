import ScrollReveal from "@/components/ScrollReveal";

interface PageHeroProps {
  titleEn: string;
  titleJa: string;
  description: string;
}

export default function PageHero({ titleEn, titleJa, description }: PageHeroProps) {
  return (
    <section className="site-header-offset relative overflow-hidden pb-10 md:pb-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(201,169,98,0.06),transparent)]"
        aria-hidden="true"
      />
      <div className="site-container relative">
        <ScrollReveal immediate>
          <span className="section-label">{titleEn}</span>
          <h1 className="section-title mb-4 max-w-3xl">{titleJa}</h1>
          <p className="max-w-3xl text-[15px] leading-[1.85] text-cream-muted md:text-base">
            {description}
          </p>
        </ScrollReveal>
        <ScrollReveal immediate delay={0.12}>
          <div className="hairline mt-8" />
        </ScrollReveal>
      </div>
    </section>
  );
}
