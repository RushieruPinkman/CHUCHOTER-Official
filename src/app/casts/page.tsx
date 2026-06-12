import type { Metadata } from "next";
import { Suspense } from "react";
import CastsGrid from "@/components/CastsGrid";
import CastLegacyRedirect from "@/components/CastLegacyRedirect";
import PageHero from "@/components/PageHero";
import { getCasts } from "@/lib/data";
import { buildPageMetadata } from "@/lib/seo";
export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "住人紹介",
  description:
    "CHUCHOTER（シュシュテ）の住人紹介。Le Ciel Blanc・黒糖アメをはじめ、VRChat完全個室1対1イベントで出会えるレジデンスのプロフィールを掲載しています。",
  path: "/casts",
});

export default async function CastsPage() {
  const casts = await getCasts();

  return (
    <>
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
