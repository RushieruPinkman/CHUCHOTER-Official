import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "ガチャ",
  description:
    "CHUCHOTER 運命の扉 — 毎日1回無料ガチャと CP 追加抽選。X シェアで CP を貯め、景品を獲得できます。",
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
      <PageHero
        titleEn="Fortune"
        titleJa="運命の扉"
        description="扉の向こうに待つ景品を、毎日1回の無料ガチャと CP で抽選。無料ガチャのあと X でシェアして CP を貯めよう。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
