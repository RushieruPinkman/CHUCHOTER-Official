import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ガチャ",
  description:
    "CHUCHOTERの運命の扉 — CP（シュシュテポイント）で景品抽選。デイリータスクで CP を貯め、100 CP で1回・900 CP で10連。",
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
        description="扉の向こうに待つ景品を、CP（シュシュテポイント）で抽選。デイリータスクをクリアして CP を貯め、100 CP で1回・900 CP で10連。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
