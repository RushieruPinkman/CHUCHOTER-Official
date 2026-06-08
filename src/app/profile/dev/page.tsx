import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import ProfileDevClient from "@/components/ProfileDevClient";
import { isAuthDevEnabled } from "@/lib/auth-dev";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "プロフィール（開発用）",
  robots: { index: false, follow: false },
};

export default function ProfileDevPage() {
  if (!isAuthDevEnabled()) {
    notFound();
  }

  return (
    <>
      <PageHero
        titleEn="Dev Profile"
        titleJa="プロフィール試験"
        description="開発用テストアカウントのプロフィール画面です。"
      />
      <section className="site-container pb-16">
        <ProfileDevClient />
        <p className="mt-8 text-center text-xs text-cream-faint">
          <Link href="/profile" className="link-gold text-gold">
            ← 本番プロフィール（/profile）へ
          </Link>
        </p>
      </section>
    </>
  );
}
