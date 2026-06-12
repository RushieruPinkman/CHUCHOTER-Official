import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import PageHero from "@/components/PageHero";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "パスワード再設定",
  description: "CHUCHOTER 会員アカウントのパスワード再設定。",
  path: "/login/reset-password",
  index: false,
  follow: false,
});

export default async function ResetPasswordPage() {
  if (!isUserAuthEnabledOnServer()) {
    redirect("/login?mode=forgot");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?mode=forgot");
  }

  return (
    <>
      <PageHero
        titleEn="Reset Password"
        titleJa="パスワード再設定"
        description="メールのリンクからアクセスした後、新しいパスワードを設定してください。"
      />
      <section className="site-container pb-16">
        <ResetPasswordForm nextPath="/profile" />
      </section>
    </>
  );
}
