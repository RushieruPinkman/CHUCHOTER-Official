"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CastPortrait from "@/components/CastPortrait";
import {
  GACHA_COLLECTION_UPDATED_EVENT,
  getGachaCollectionTotal,
  groupGachaCollectionByGender,
  readGachaCollection,
  type GachaCollectionEntry,
} from "@/lib/gacha-collection";

interface ProfileCollectionProps {
  userKey: string;
  className?: string;
  headingId?: string;
  showEmptyGachaLink?: boolean;
}

const GENDER_SECTIONS = [
  { key: "female" as const, labelEn: "Female", labelJa: "女性" },
  { key: "male" as const, labelEn: "Male", labelJa: "男性" },
];

function CollectionCard({ entry }: { entry: GachaCollectionEntry }) {
  return (
    <li>
      <Link
        href={`/casts/${entry.castId}`}
        className="profile-collection__item group block border border-[var(--color-border)] bg-deep/70 transition-colors hover:border-gold/40"
      >
        <div className="cast-card-media relative aspect-[3/4]">
          <div className="cast-card-media__media">
            <div className="cast-card-media__zoom">
              <CastPortrait src={entry.image} alt={entry.name} variant="cover" />
              <div className="cast-card-media__gradient" aria-hidden="true" />
            </div>
          </div>
          <span
            className="profile-collection__count absolute right-2 top-2 min-w-[2rem] border border-gold/40 bg-deep/90 px-2 py-0.5 text-center text-[11px] tracking-[0.08em] text-gold"
            aria-label={`${entry.count}枚`}
          >
            ×{entry.count}
          </span>
        </div>
        <div className="border-t border-[var(--color-border)] px-3 py-3 text-center">
          <p className="font-serif-jp text-sm text-cream transition-colors group-hover:text-gold">
            {entry.name}
          </p>
          {entry.nameEn && (
            <p className="mt-0.5 text-[10px] tracking-[0.12em] text-cream-faint uppercase">
              {entry.nameEn}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function ProfileCollection({
  userKey,
  className = "",
  headingId = "profile-collection-heading",
  showEmptyGachaLink = true,
}: ProfileCollectionProps) {
  const [entries, setEntries] = useState<GachaCollectionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setEntries(readGachaCollection(userKey));
  }, [userKey]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey?: string }>).detail;
      if (!detail?.userKey || detail.userKey === userKey) {
        refresh();
      }
    };

    window.addEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
  }, [refresh, userKey]);

  const grouped = useMemo(() => groupGachaCollectionByGender(entries), [entries]);
  const total = getGachaCollectionTotal(entries);

  return (
    <section
      className={`profile-collection mx-auto max-w-3xl ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <p className="section-label mb-1">Collection</p>
          <h2 id={headingId} className="font-display text-xl text-gold md:text-2xl">
            コレクション
          </h2>
        </div>
        {hydrated && total > 0 && (
          <p className="text-xs tracking-[0.12em] text-cream-faint">
            所持 <span className="text-cream-muted">{total}</span> 枚
          </p>
        )}
      </div>

      {!hydrated ? (
        <p className="py-8 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : entries.length === 0 ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-cream-muted">
            まだコレクションがありません。
          </p>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">
            運命の扉で★1の住人が現れると、ここに追加されます。
          </p>
          {showEmptyGachaLink && (
            <Link href="/gacha" className="btn-ghost mt-6 inline-flex min-h-11 items-center px-6">
              運命の扉へ
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-10 md:space-y-12">
          {GENDER_SECTIONS.map(({ key, labelEn, labelJa }) => {
            const sectionEntries = grouped[key];
            const sectionTotal = getGachaCollectionTotal(sectionEntries);
            const sectionHeadingId = `${headingId}-${key}`;

            return (
              <section key={key} aria-labelledby={sectionHeadingId}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <div>
                    <p className="section-label mb-1">{labelEn}</p>
                    <h3 id={sectionHeadingId} className="font-serif-jp text-lg text-cream md:text-xl">
                      {labelJa}
                    </h3>
                  </div>
                  <p className="text-[11px] tracking-[0.12em] text-cream-faint">
                    {sectionTotal > 0 ? (
                      <>
                        <span className="text-cream-muted">{sectionTotal}</span> 枚
                      </>
                    ) : (
                      "0 枚"
                    )}
                  </p>
                </div>

                {sectionEntries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-cream-faint">
                    まだ{labelJa}の住人はコレクションにありません。
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5">
                    {sectionEntries.map((entry) => (
                      <CollectionCard key={entry.castId} entry={entry} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
