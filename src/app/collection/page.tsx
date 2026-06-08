import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaCollectionSection from "@/components/GachaCollectionSection";
import { getCasts } from "@/lib/data";
import { toResidentCastRefs } from "@/lib/gacha-collection-exchange";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "コレクション",
  description:
    "運命の扉で★1として出会った住人のコレクション。コンプリートで★4〜★6と交換できます。",
};

export default async function CollectionPage() {
  const casts = await getCasts();
  const residents = toResidentCastRefs(casts);

  return (
    <>
      <PageHero
        titleEn="Collection"
        titleJa="コレクション"
        description="★1の住人カードを集め、男女別・全員コンプリートで★4〜★6の景品と交換できます。交換時は対象の住人カードを各1枚ずつ消費します。"
      />
      <section className="site-container pb-16">
        <GachaCollectionSection residents={residents} />
      </section>
    </>
  );
}
