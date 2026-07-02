import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import BonusRouletteApp from "@/components/BonusRouletteApp";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "ボーナスルーレット（開発用）",
  description: "CHUCHOTER ボーナスルーレット開発用ページ。",
  path: "/bonus/dev",
  index: false,
  follow: false,
});

export default function BonusDevPage() {
  if (!isAuthDevEnabled()) {
    notFound();
  }

  return (
    <>
      <PageHero
        titleEn="Dev Bonus"
        titleJa="ボーナス試験"
        description="ローカル開発専用。Supabase 未設定時はブラウザ保存で試せます。本番サイトには公開されません。"
      />
      <BonusRouletteApp mode="dev" loginNextPath="/bonus/dev" />
    </>
  );
}
