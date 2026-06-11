import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import type { GachaCastSnapshot } from "@/lib/gacha";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ガチャ",
  description:
    "CHUCHOTERの運命の扉 — 毎日1回無料ガチャ + CP追加抽選。無料ガチャ後にXシェアでCPを貯め、100 CPで1回・900 CPで10連。",
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
        description="扉の向こうに待つ景品を、毎日1回の無料ガチャと CP で抽選。無料ガチャのあと X でシェアして CP を貯めよう。"
      />
      <GachaMachine casts={gachaCasts} />
    </>
  );
}
