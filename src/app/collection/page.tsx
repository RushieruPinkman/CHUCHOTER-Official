import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaCollectionSection from "@/components/GachaCollectionSection";
import { getCasts } from "@/lib/data";
import { toResidentCastRefs } from "@/lib/gacha-collection-exchange";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "コレクション",
  description:
    "CHUCHOTER 運命の扉で獲得した★1住人カードのコレクション。重複交換やコンプリートで景品と交換できます。",
  path: "/collection",
});

export default async function CollectionPage() {
  const casts = await getCasts();
  const residents = toResidentCastRefs(casts);

  return (
    <>
      <PageHero
        titleEn="Collection"
        titleJa="コレクション"
        description="★1の住人カードを集め、同じカード3枚で好きな★1カード1枚と交換できます。男女別・全員コンプリートで★4〜★6の景品とも交換できます。"
      />
      <section className="site-container pb-16">
        <GachaCollectionSection residents={residents} />
      </section>
    </>
  );
}
