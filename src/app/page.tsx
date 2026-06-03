import Button from "@/components/Button";
import Logo from "@/components/Logo";
import ScrollReveal from "@/components/ScrollReveal";
import StatusBadge from "@/components/StatusBadge";
import AnnouncementList from "@/components/AnnouncementList";
import XLink from "@/components/XLink";
import { getAnnouncements, getCasts, getStatus } from "@/lib/data";
import { SITE } from "@/lib/site";
import Link from "next/link";

export default async function HomePage() {
  const [status, casts, announcements] = await Promise.all([
    getStatus(),
    getCasts(),
    getAnnouncements(),
  ]);

  return (
    <>
      {/* Hero */}
      <section
        className="relative flex min-h-[100svh] flex-col"
        aria-labelledby="hero-title"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(201,169,98,0.09),transparent_65%)]"
          aria-hidden="true"
        />

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-6 pt-24 text-center">
          <ScrollReveal immediate className="mb-6">
            <StatusBadge status={status} />
          </ScrollReveal>

          <ScrollReveal immediate delay={0.08}>
            <h1 id="hero-title" className="mb-6">
            <Logo size="lg" priority className="mx-auto" />
              <span className="sr-only">{SITE.name}</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal immediate delay={0.16}>
            <p
              className="mx-auto mb-8 max-w-xl text-[15px] leading-[1.85] text-cream-muted md:text-base"
              style={{ fontFamily: "var(--font-serif-jp)" }}
            >
              {SITE.tagline}
            </p>
          </ScrollReveal>

          <ScrollReveal immediate delay={0.24} className="flex flex-wrap justify-center gap-4">
            <Button href="/system#request-invite">Request Invite</Button>
            <Button href="/casts" variant="ghost">
              住人を見る
            </Button>
          </ScrollReveal>
        </div>

        <div className="flex shrink-0 justify-center pb-6 pt-4">
          <div className="flex flex-col items-center gap-3 text-cream-faint" aria-hidden="true">
            <span className="sr-only">スクロールして続きを読む</span>
            <span className="scroll-hint block h-10 w-px bg-gradient-to-b from-gold/40 to-transparent" />
          </div>
        </div>
      </section>

      <AnnouncementList items={announcements} />

      {/* Concept */}
      <section className="section-py" aria-labelledby="concept-heading">
        <div className="site-container">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <ScrollReveal>
              <span className="section-label">Concept</span>
              <h2 id="concept-heading" className="section-title mb-5">
                喧騒の向こう側へ
              </h2>
              <p className="text-[15px] leading-[2] text-cream-muted">
                CHUCHOTERは、VRChat内で提供される完全私室の1対1空間です。パブリックの騒がしさから離れ、静かで質の高いコミュニケーションを求める方に、コンシェルジュ目線のおもてなしをお届けします。
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1} className="space-y-px">
              {[
                { num: "01", title: "完全私室", desc: "1対1の個別ルームで、あなただけの特別な時間。" },
                {
                  num: "02",
                  title: "1部 · 2部制",
                  desc: `1部 ${SITE.part1Time}〜、2部 ${SITE.part2Time}〜の落ち着いた営業時間。`,
                },
                { num: "03", title: "選ばれた空間", desc: "高級マンションの隠れ家を思わせる、洗練された世界観。" },
              ].map((item) => (
                <article
                  key={item.num}
                  className="panel panel-hover flex gap-5 border-b-0 p-5 md:p-6"
                >
                  <span
                    className="text-2xl italic text-gold-dim"
                    style={{ fontFamily: "var(--font-display)" }}
                    aria-hidden="true"
                  >
                    {item.num}
                  </span>
                  <div>
                    <h3
                      className="mb-2 text-lg text-gold"
                      style={{ fontFamily: "var(--font-serif-jp)" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-cream-muted">{item.desc}</p>
                  </div>
                </article>
              ))}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Residents preview */}
      <section className="section-py border-t border-[var(--color-border)]" aria-labelledby="residents-heading">
        <div className="site-container">
          <ScrollReveal className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="section-label">Residents</span>
              <h2 id="residents-heading" className="section-title">
                住人紹介
              </h2>
            </div>
            <Link
              href="/casts"
              className="text-sm tracking-[0.15em] text-gold transition-opacity hover:opacity-70"
            >
              View All →
            </Link>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {casts.slice(0, 2).map((cast, index) => (
              <ScrollReveal key={cast.id} delay={index * 0.08}>
                <Link
                  href={`/casts?cast=${cast.id}`}
                  className="group panel panel-hover block overflow-hidden"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cast.image}
                      alt={`${cast.name}のポートレート`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <p
                        className="text-xl text-gold md:text-2xl"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {cast.nameEn}
                      </p>
                      <p className="mt-1 text-sm text-cream-muted">{cast.tagline}</p>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-py" aria-labelledby="cta-heading">
        <div className="site-container">
          <ScrollReveal>
            <div className="panel relative overflow-hidden px-6 py-10 text-center md:px-10 md:py-14">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,98,0.08),transparent_70%)]"
                aria-hidden="true"
              />
              <span className="section-label">Tonight</span>
              <h2 id="cta-heading" className="section-title mb-4">
                今夜、私室へ
              </h2>
              <p className="mx-auto mb-6 max-w-xl text-sm leading-[1.85] text-cream-muted">
                Request Inviteの手順はご案内ページに詳しく記載しています。
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button href="/system#request-invite">Request Invite</Button>
                <XLink href={SITE.xUrl} size="lg" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
