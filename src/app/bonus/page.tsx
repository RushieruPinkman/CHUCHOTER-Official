import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHero from "@/components/PageHero";
import BonusRouletteApp from "@/components/BonusRouletteApp";
import SeoJsonLd from "@/components/SeoJsonLd";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";
import { buildPageMetadata, buildPublicPageBreadcrumb } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "ボーナスルーレット",
  description:
    "デイリー・ウィークリー・マンスリーボーナスルーレット。CHUCHOTER（シュシュテ）公式サイトで CP を獲得。",
  path: "/bonus",
});

export default function BonusPage() {
  if (isAuthDevEnabled() && !isUserAuthEnabledOnServer()) {
    redirect("/bonus/dev");
  }

  return (
    <>
      <SeoJsonLd data={buildPublicPageBreadcrumb("ボーナスルーレット", "/bonus")} />
      <PageHero
        titleEn="Bonus Roulette"
        titleJa="ボーナスルーレット"
        description="デイリー・ウィークリー・マンスリーのルーレットで CP を獲得。抽選はルーレットを回した時点で確定します。"
      />
      <BonusRouletteApp />
    </>
  );
}
