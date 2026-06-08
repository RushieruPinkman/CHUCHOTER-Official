import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AuthDevLoginForm from "@/components/AuthDevLoginForm";
import PageHero from "@/components/PageHero";
import { isAuthDevEnabled } from "@/lib/auth-dev";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ログイン（開発用）",
  robots: { index: false, follow: false },
};

export default function LoginDevPage() {
  if (!isAuthDevEnabled()) {
    notFound();
  }

  return (
    <>
      <PageHero
        titleEn="Dev Sign In"
        titleJa="ログイン試験"
        description="ローカル開発専用。Supabase なしでログイン〜プロフィール表示を試せます。本番サイトには公開されません。"
      />
      <section className="site-container pb-16">
        <Suspense
          fallback={
            <div className="mx-auto max-w-md py-8 text-center text-sm text-cream-faint">
              読み込み中…
            </div>
          }
        >
          <AuthDevLoginForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-cream-faint">
          <Link href="/login" className="link-gold text-gold">
            ← 本番ログイン（/login）へ
          </Link>
        </p>
      </section>
    </>
  );
}
