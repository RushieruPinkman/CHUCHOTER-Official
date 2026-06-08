import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHero from "@/components/PageHero";
import ProfilePanel from "@/components/ProfilePanel";
import ProfileCollection from "@/components/ProfileCollection";
import ProfileSignOut from "@/components/ProfileSignOut";
import { AUTH_DEV_LOGIN_PATH } from "@/lib/auth-dev";
import { getUserDisplayLabel } from "@/lib/auth-messages";
import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "プロフィール",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  if (!isUserAuthEnabledOnServer()) {
    if (process.env.NODE_ENV === "development") {
      redirect(`${AUTH_DEV_LOGIN_PATH}?next=/profile/dev`);
    }
    redirect("/login?next=/profile");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=/profile");
  }

  const displayName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    getUserDisplayLabel(user.email);

  return (
    <>
      <PageHero
        titleEn="Profile"
        titleJa="プロフィール"
        description="CHUCHOTER 会員アカウント情報"
      />
      <section className="site-container pb-16">
        <ProfilePanel
          profile={{
            displayName,
            email: user.email,
            loggedInAt: user.last_sign_in_at ?? user.created_at,
            mode: "production",
          }}
        />
        <ProfileCollection userKey={buildAuthCollectionUserKey(user.id)} className="mt-10" />
        <div className="mx-auto mt-6 max-w-lg text-center">
          <ProfileSignOut />
        </div>
      </section>
    </>
  );
}
