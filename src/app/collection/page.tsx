import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GachaCollectionSection from "@/components/GachaCollectionSection";
import { getCasts } from "@/lib/data";
import { toResidentCastRefs } from "@/lib/gacha-collection-exchange";
import SeoJsonLd from "@/components/SeoJsonLd";
import { buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "コレクション",
  description:
    "★1住人カードのコレクションと重複交換。CHUCHOTER（シュシュテ）公式サイトのコレクションページです。",
  path: "/collection",
});

export default async function CollectionPage() {
  const casts = await getCasts();
  const residents = toResidentCastRefs(casts);

  return (
    <>
      <SeoJsonLd data={buildPublicPageBreadcrumb("コレクション", "/collection")} />
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
