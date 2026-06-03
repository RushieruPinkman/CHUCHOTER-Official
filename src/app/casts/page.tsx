import type { Metadata } from "next";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import CastsGrid from "@/components/CastsGrid";
import { getCasts } from "@/lib/data";
export const metadata: Metadata = {
  title: "住人紹介",
  description:
    "CHUCHOTERのレジデンス — Le Ciel Blanc、黒糖アメをはじめとする住人のプロフィール。",
};

export default async function CastsPage() {
  const casts = await getCasts();

  return (
    <>
      <PageHero
        titleEn="The Residence"
        titleJa="住人紹介"
        description="マンションの各部屋に滞在する住人たち。それぞれの個室で、あなただけの特別な時間をお届けします。"
      />
      <Suspense fallback={<div className="site-container pb-14 md:pb-16" />}>
        <CastsGrid casts={casts} />
      </Suspense>
    </>
  );
}
