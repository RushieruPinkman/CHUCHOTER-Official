import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import PageHero from "@/components/PageHero";
import { createClient } from "@/lib/supabase/server";
import { getMissingUserAuthEnvVars, isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "ログイン",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (isUserAuthEnabledOnServer()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) redirect("/profile");
    } catch {
      /* 設定不備時はフォーム側で案内 */
    }
  }

  return (
    <>
      <PageHero
        titleEn="Sign In"
        titleJa="ログイン"
        description="CHUCHOTER 会員アカウントでログインできます。初めての方は新規登録から、確認メールで本登録を完了してください。"
      />
      <section className="site-container pb-16">
        <Suspense fallback={<div className="mx-auto max-w-md py-8 text-center text-sm text-cream-faint">読み込み中…</div>}>
          <LoginForm
            authEnabled={isUserAuthEnabledOnServer()}
            missingEnv={getMissingUserAuthEnvVars()}
          />
        </Suspense>
      </section>
    </>
  );
}
