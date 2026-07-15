import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ScrollReveal from "@/components/ScrollReveal";
import XLink from "@/components/XLink";
import { SITE } from "@/lib/site";
import SeoJsonLd from "@/components/SeoJsonLd";
import { buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "ラウンジ",
  description:
    "公式ポスター画像と女性キャスト・スタッフ募集のご案内。CHUCHOTER（シュシュテ）公式サイトのラウンジページです。",
  path: "/media",
});

export const revalidate = 86400;

const POSTER_SRC = "/images/lounge/poster.png";

export default function MediaPage() {
  return (
    <>
      <SeoJsonLd data={buildPublicPageBreadcrumb("ラウンジ", "/media")} />
      <PageHero
        titleEn="The Lounge"
        titleJa="ラウンジ"
        description="CHUCHOTERの公式ポスターと、女性キャスト・スタッフの募集情報をご案内しております。"
      />

      <section className="pb-10 md:pb-12" aria-labelledby="poster-heading">
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">Poster</span>
            <h2 id="poster-heading" className="section-title mb-5">
              公式ポスター
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <figure className="mx-auto flex w-full max-w-2xl flex-col items-center md:max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={POSTER_SRC}
                alt="CHUCHOTER 公式ポスター — キャスト一覧、開催日時、参加方法（Request Invite）、VRChat ID・公式X"
                className="max-h-[calc(100svh-14rem)] w-auto max-w-full object-contain"
                loading="eager"
                decoding="async"
              />
              <figcaption className="mt-3 text-center text-xs leading-relaxed text-cream-faint">
                開催：火・水・木（不定期） 1部 20:50〜 / 2部 22:00〜
              </figcaption>
            </figure>
          </ScrollReveal>
        </div>
      </section>

      <section
        className="section-py border-t border-[var(--color-border)]"
        aria-labelledby="recruit-heading"
      >
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">Recruit</span>
            <h2 id="recruit-heading" className="section-title mb-5">
              キャスト・スタッフ募集
            </h2>
          </ScrollReveal>

          <div className="mx-auto max-w-3xl space-y-3 text-sm leading-[1.85] text-cream-muted">
            <p>
              CHUCHOTERでは、女性キャストおよびスタッフを募集しております。完全私室でのおもてなしや、クラブ運営に携わりたい方を歓迎いたします。
            </p>
            <p>
              静かで上質な空間づくりに共感いただける方、VRChatでのコミュニケーション経験を活かしたい方、ぜひご連絡ください。詳細な条件や稼働イメージについては、個別にご説明いたします。
            </p>
            <p>ご応募・お問い合わせは公式XのDMよりお気軽にどうぞ。</p>
            <div className="flex items-center gap-4 pt-1">
              <XLink href={SITE.xUrl} size="lg" label="公式Xで問い合わせる" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
