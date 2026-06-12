"use client";

import Link from "next/link";
import CollectionView from "@/components/CollectionView";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import type { ResidentCastRef } from "@/lib/gacha-collection-exchange";

interface GachaCollectionSectionProps {
  residents: ResidentCastRef[];
  className?: string;
  headingId?: string;
  loginNextPath?: string;
  showEmptyGachaLink?: boolean;
  showExchange?: boolean;
}

function getCollectionLoginHref(nextPath: string): string {
  return getAuthLoginHref(nextPath);
}

export default function GachaCollectionSection({
  residents,
  className = "",
  headingId = "collection-heading",
  loginNextPath = "/collection",
  showEmptyGachaLink = true,
  showExchange = true,
}: GachaCollectionSectionProps) {
  const { userKey, ready } = useCollectionUserKey();

  if (!ready) {
    return (
      <section className={`mx-auto max-w-3xl ${className}`.trim()} aria-labelledby={headingId}>
        <div className="mb-5 border-b border-[var(--color-border)] pb-4">
          <p className="section-label mb-1">Collection</p>
          <h2 id={headingId} className="font-display text-xl text-gold md:text-2xl">
            コレクション
          </h2>
        </div>
        <p className="py-8 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      </section>
    );
  }

  if (!userKey) {
    return (
      <section className={`mx-auto max-w-3xl ${className}`.trim()} aria-labelledby={headingId}>
        <div className="mb-5 border-b border-[var(--color-border)] pb-4">
          <p className="section-label mb-1">Collection</p>
          <h2 id={headingId} className="font-display text-xl text-gold md:text-2xl">
            コレクション
          </h2>
        </div>
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-cream-muted">
            ログインすると、★1で出た住人がコレクションに追加されます。
          </p>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">
            重複交換（★1）やコンプリート交換（★4〜★6）もここから利用できます。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={getCollectionLoginHref(loginNextPath)}
              className="btn-primary inline-flex min-h-11 items-center px-6"
            >
              ログイン
            </Link>
            <Link
              href={getAuthRegisterHref(loginNextPath)}
              className="btn-ghost inline-flex min-h-11 items-center px-6"
            >
              新規登録
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <CollectionView
      userKey={userKey}
      residents={residents}
      headingId={headingId}
      showEmptyGachaLink={showEmptyGachaLink}
      showExchange={showExchange}
    />
  );
}
