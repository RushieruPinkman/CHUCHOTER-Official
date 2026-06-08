import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ガチャ",
  description:
    "CHUCHOTERの運命の扉 — 景品抽選。★1は住人がランダム登場。★2〜★3はサイトからダウンロード。★4以上は当選カードを @CHUCHOTER_VRC へDMでお送りください。",
};

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
        description="扉の向こうに待つ景品を、運に委ねて。★1は住人がランダム登場。★2〜★3は当選後にサイトからダウンロード。★4以上は公式XアカウントへDMでご連絡ください。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
