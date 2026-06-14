import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import PageHero from "@/components/PageHero";
import { createClient } from "@/lib/supabase/server";
import { getMissingUserAuthEnvVars, isUserAuthEnabledOnServer } from "@/lib/supabase/config";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "新規登録",
  description: "CHUCHOTER 会員登録。メールアドレスでアカウントを作成し、ガチャやコレクション機能をご利用ください。",
  path: "/register",
  index: false,
  follow: false,
});

export default async function RegisterPage() {
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
        titleEn="Sign Up"
        titleJa="新規登録"
        description="メールアドレスとVRChat上の表示名でアカウントを作成します。確認メールのリンクから本登録を完了してください。"
      />
      <section className="site-container pb-16">
        <Suspense fallback={<div className="mx-auto max-w-md py-8 text-center text-sm text-cream-faint">読み込み中…</div>}>
          <LoginForm
            authEnabled={isUserAuthEnabledOnServer()}
            missingEnv={getMissingUserAuthEnvVars()}
            defaultMode="signup"
          />
        </Suspense>
      </section>
    </>
  );
}
