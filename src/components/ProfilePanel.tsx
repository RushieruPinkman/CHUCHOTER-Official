import Link from "next/link";
import { AUTH_DEV_LOGIN_PATH, formatAuthTimestamp } from "@/lib/auth-dev";

export interface ProfileView {
  displayName: string;
  email: string;
  loggedInAt?: string;
  mode: "production" | "dev";
}

interface ProfilePanelProps {
  profile: ProfileView;
}

export default function ProfilePanel({ profile }: ProfilePanelProps) {
  const isDev = profile.mode === "dev";

  return (
    <div className="auth-panel mx-auto max-w-lg border border-[var(--color-border)] bg-deep/90 p-6 md:p-8">
      {isDev && (
        <p className="mb-5 rounded-sm border border-gold/25 bg-gold/10 px-3 py-2 text-center text-xs leading-relaxed text-cream-muted">
          【開発専用】テストアカウント — 本番には反映されません
        </p>
      )}

      <div className="space-y-6 text-center">
        <div>
          <p className="section-label mb-2">Member</p>
          <h2 className="font-display text-2xl text-gold md:text-3xl">{profile.displayName}</h2>
        </div>

        <dl className="space-y-4 text-left">
          <div className="border-b border-[var(--color-border)] pb-4">
            <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
              Email
            </dt>
            <dd className="break-all text-sm text-cream">{profile.email}</dd>
          </div>
          {profile.loggedInAt && (
            <div className="border-b border-[var(--color-border)] pb-4">
              <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
                {isDev ? "テストログイン" : "登録・ログイン"}
              </dt>
              <dd className="text-sm text-cream-muted">{formatAuthTimestamp(profile.loggedInAt)}</dd>
            </div>
          )}
          <div>
            <dt className="mb-1 text-[11px] tracking-[0.15em] text-cream-faint uppercase">
              Account
            </dt>
            <dd className="text-sm text-cream-muted">
              {isDev ? "ローカル開発用テストアカウント" : "CHUCHOTER 会員"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isDev ? (
          <Link href={AUTH_DEV_LOGIN_PATH} className="btn-ghost min-h-11 px-6 text-center">
            別アカウントで試す
          </Link>
        ) : (
          <Link href="/gacha" className="btn-ghost min-h-11 px-6 text-center">
            運命の扉へ
          </Link>
        )}
        <Link href="/" className="btn-ghost min-h-11 px-6 text-center">
          トップへ
        </Link>
      </div>
    </div>
  );
}
