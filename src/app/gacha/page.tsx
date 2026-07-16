import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

import SeoJsonLd from "@/components/SeoJsonLd";
import { buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = buildPageMetadata({
  title: "ガチャ",
  description:
    "運命の扉 — 毎日1回無料ガチャと CP 追加抽選。CHUCHOTER（シュシュテ）公式サイトのガチャページです。",
  path: "/gacha",
});

export default async function GachaPage() {
  const casts = await getCasts();
  const gachaCasts: GachaCastSnapshot[] = casts.map((cast) => ({
    id: cast.id,
    name: cast.name,
    nameEn: cast.nameEn,
    image: cast.image,
    gender: cast.gender ?? "female",
  }));

  return (
    <>
      <SeoJsonLd data={buildPublicPageBreadcrumb("運命の扉", "/gacha")} />
      <PageHero
        titleEn="Fortune"
        titleJa="運命の扉"
        description="扉の向こうに待つ景品を、毎日1回の無料ガチャと CP で抽選。無料ガチャのあと X でシェアして CP を貯めよう。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
