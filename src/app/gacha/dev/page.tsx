import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import GachaMachine from "@/components/GachaMachine";
import { getCasts } from "@/lib/data";
import { isGachaDevEnabled } from "@/lib/gacha-dev";
import type { GachaCastSnapshot } from "@/lib/gacha";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ガチャ（開発用）",
  robots: { index: false, follow: false },
};

export default async function GachaDevPage() {
  if (!isGachaDevEnabled()) {
    notFound();
  }

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
        titleEn="Dev Sandbox"
        titleJa="ガチャ試験"
        description="ローカル開発専用。回数制限なし・確率均等（各16.67%）。本番サイトには公開されません。"
      />
      <GachaMachine casts={gachaCasts} mode="dev" />
      <p className="site-container pb-12 text-center text-xs text-cream-faint">
        <Link href="/gacha" className="link-gold text-gold">
          ← 本番ガチャ（/gacha）へ
        </Link>
      </p>
    </>
  );
}
