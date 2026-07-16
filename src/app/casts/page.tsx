import type { Metadata } from "next";
import { Suspense } from "react";
import CastsGrid from "@/components/CastsGrid";
import CastLegacyRedirect from "@/components/CastLegacyRedirect";
import PageHero from "@/components/PageHero";
import { getCasts } from "@/lib/data";
import SeoJsonLd from "@/components/SeoJsonLd";
import { buildCastListJsonLd, buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";
export const revalidate = 86400;

export const metadata: Metadata = buildPageMetadata({
  title: "住人紹介",
  description:
    "レジデンス住人のプロフィール一覧。VRChat完全個室1対1イベント CHUCHOTER（シュシュテ）公式サイトの住人紹介ページです。",
  path: "/casts",
});

export default async function CastsPage() {
  const casts = await getCasts();
  const castListJsonLd = buildCastListJsonLd(casts.map((cast) => ({ id: cast.id, name: cast.name })));
  const structuredData = [
    buildPublicPageBreadcrumb("住人紹介", "/casts"),
    ...(castListJsonLd ? [castListJsonLd] : []),
  ];

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <PageHero
        titleEn="The Residence"
        titleJa="住人紹介"
        description="マンションの各部屋に滞在する住人たち。それぞれの個室で、あなただけの特別な時間をお届けします。"
      />
      <Suspense fallback={null}>
        <CastLegacyRedirect />
      </Suspense>
      <Suspense fallback={<div className="site-container pb-14 md:pb-16" />}>
        <CastsGrid casts={casts} />
      </Suspense>
    </>
  );
}
