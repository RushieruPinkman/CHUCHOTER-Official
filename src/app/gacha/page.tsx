import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ガチャ",
  description:
    "CHUCHOTERの運命の扉 — 景品抽選。★1は住人がランダム登場。★2〜★3はサイトからダウンロード。★4以上は運営DMに当選内容をお送りください。",
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
        description="扉の向こうに待つ景品を、運に委ねて。ログイン後に1日1回抽選できます。★1は住人がランダム登場。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
