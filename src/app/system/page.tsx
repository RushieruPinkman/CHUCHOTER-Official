import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ScrollReveal from "@/components/ScrollReveal";
import AnnouncementList from "@/components/AnnouncementList";
import VrChatGroupLink from "@/components/VrChatGroupLink";
import XLink from "@/components/XLink";
import { getAnnouncements } from "@/lib/data";
import { SITE } from "@/lib/site";
import FaqSection from "@/components/FaqSection";
import SeoJsonLd from "@/components/SeoJsonLd";
import { buildFaqJsonLd, buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "ご案内",
  description:
    "入館方法・Request Invite手順・ドレスコードのご案内。VRChat完全個室1対1イベント CHUCHOTER（シュシュテ）の公式サイト内ページです。",
  path: "/system",
});

const SYSTEM_FAQ = [
  {
    question: "CHUCHOTER（シュシュテ）への入館方法は？",
    answer:
      "公式XまたはVRChatグループで営業日を確認し、指定キャストへRequest Inviteを送って招待を受け取ったうえで、指定インスタンスへ参加してください。",
  },
  {
    question: "Request Inviteは誰に送ればよいですか？",
    answer: "指定キャスト（Le Ciel Blanc / 黒糖アメ）へVRChat内でRequest Inviteをお送りください。",
  },
  {
    question: "営業時間はいつですか？",
    answer: `火・水・木（不定期）に営業しています。1部 ${SITE.part1Time}〜、2部 ${SITE.part2Time}〜です。詳細は営業予定表をご確認ください。`,
  },
];

const STEPS = [
  {
    step: "01",
    title: "公式X・グループを確認",
    desc: "営業日・Request Inviteの受付状況は公式XまたはVRChatグループでご確認ください。",
  },
  { step: "02", title: "Request Invite", desc: "指定キャスト（Le Ciel Blanc / 黒糖アメ）へVRChat内でRequest Inviteをお送りください。" },
  { step: "03", title: "招待を受け取る", desc: "キャストからの招待通知を確認し、指定のインスタンスへJoinしてください。" },
  { step: "04", title: "私室へ", desc: "完全1対1の個別ルームへご案内いたします。リラックスしてお過ごしください。" },
];

const MANNERS = [
  "18歳未満の参加禁止",
  "獣人、子供を連想させるアバターの使用禁止",
  "他のお客様のプライバシーを尊重し、営業時間外の接触はお控えください。",
  "空間の雰囲気を損なう過度な言動やハラスメント行為は固くお断りいたします。",
  "録画・録音・スクリーンショットは、事前の許可なく行わないでください。",
  "VRChatの利用規約およびコミュニティガイドラインを遵守してください。",
  "体調不良時は無理せず、またの機会をお待ちしております。",
];

export default async function SystemPage() {
  const announcements = await getAnnouncements();

  return (
    <>
      <SeoJsonLd
        data={[buildPublicPageBreadcrumb("ご利用案内", "/system"), buildFaqJsonLd(SYSTEM_FAQ)]}
      />
      <PageHero
        titleEn="Concierge"
        titleJa="ご利用案内"
        description="初めてのお客様も迷わないよう、入館からRequest Inviteまで、コンシェルジュが丁寧にご案内いたします。"
      />

      <AnnouncementList items={announcements} variant="detail" />

      <section className="pb-12 md:pb-14" aria-labelledby="system-heading">
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">System</span>
            <h2 id="system-heading" className="section-title mb-4">
              入館システム
            </h2>
            <p className="max-w-3xl text-[15px] leading-[1.85] text-cream-muted">
              CHUCHOTERは、完全1対1の個別ルーム（私室）でのサービスです。選ばれたお客様だけが静かで質の高いコミュニケーションを楽しめる空間となっております。
            </p>
          </ScrollReveal>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { label: "1部", time: `${SITE.part1Time}〜`, note: "落ち着いた時間帯の営業" },
              { label: "2部", time: `${SITE.part2Time}〜`, note: "深夜の静かな時間" },
            ].map((part) => (
              <article
                key={part.label}
                className="panel flex flex-col items-center justify-center px-6 py-5 text-center md:px-8 md:py-6"
              >
                <p
                  className="text-lg text-gold md:text-xl"
                  style={{ fontFamily: "var(--font-serif-jp)" }}
                >
                  {part.label}
                </p>
                <p
                  className="mt-1.5 text-3xl text-gold-bright md:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {part.time}
                </p>
                <p className="mt-2 text-sm text-cream-muted">{part.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="request-invite"
        className="section-py border-t border-[var(--color-border)]"
        aria-labelledby="invite-heading"
      >
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">Procedure</span>
            <h2 id="invite-heading" className="section-title mb-5">
              Request Invite
            </h2>
          </ScrollReveal>

          <ol className="grid gap-3 md:grid-cols-2">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="panel panel-hover flex h-full list-none items-start gap-4 p-5 md:gap-5 md:p-6"
              >
                <span
                  className="w-7 shrink-0 text-right text-2xl tabular-nums italic text-gold-dim"
                  style={{ fontFamily: "var(--font-display)" }}
                  aria-hidden="true"
                >
                  {item.step}
                </span>
                <div className="min-w-0 flex-1">
                  <h3
                    className="mb-2 min-h-[1.75rem] text-lg leading-snug text-cream md:min-h-[2rem]"
                    style={{ fontFamily: "var(--font-serif-jp)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm leading-[1.8] text-cream-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <ScrollReveal delay={0.08} className="mt-6">
            <div className="panel flex flex-wrap items-center justify-center gap-4 px-6 py-5 md:gap-6 md:px-8">
              <XLink href={SITE.xUrl} size="lg" label="公式Xを開く" />
              <VrChatGroupLink href={SITE.vrchatGroupUrl} size="lg" label="VRChatグループを開く" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <FaqSection items={SYSTEM_FAQ} />

      <section className="section-py border-t border-[var(--color-border)]" aria-labelledby="manner-heading">
        <div className="site-container">
          <ScrollReveal>
            <span className="section-label">Etiquette</span>
            <h2 id="manner-heading" className="section-title mb-5">
              ドレスコード · マナー
            </h2>
          </ScrollReveal>

          <ul className="mx-auto max-w-3xl space-y-3">
            {MANNERS.map((manner) => (
              <li
                key={manner}
                className="flex gap-4 text-left text-sm leading-[1.9] text-cream-muted before:mt-2.5 before:block before:h-px before:w-4 before:shrink-0 before:bg-gold/60"
              >
                {manner}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
