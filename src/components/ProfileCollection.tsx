"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CastPortrait from "@/components/CastPortrait";
import type { ResidentCastRef } from "@/lib/gacha-collection-exchange";
import {
  buildCollectionDisplayItems,
  GACHA_COLLECTION_UPDATED_EVENT,
  getGachaCollectionTotal,
  groupCollectionDisplayByGender,
  groupGachaCollectionByGender,
  readGachaCollection,
  sortCollectionDisplayItems,
  type CollectionDisplayItem,
  type CollectionSortMode,
  type GachaCollectionEntry,
} from "@/lib/gacha-collection";

interface ProfileCollectionProps {
  userKey: string;
  /** 指定時は全住人を表示し、未所持カードをグレーアウト */
  residents?: ResidentCastRef[];
  className?: string;
  headingId?: string;
  showEmptyGachaLink?: boolean;
}

const GENDER_SECTIONS = [
  { key: "female" as const, labelEn: "Female", labelJa: "女性" },
  { key: "male" as const, labelEn: "Male", labelJa: "男性" },
];

const SORT_OPTIONS: { value: CollectionSortMode; label: string }[] = [
  { value: "owned-first", label: "所持優先" },
  { value: "unowned-first", label: "未所持優先" },
];

function CollectionCard({ item }: { item: CollectionDisplayItem | GachaCollectionEntry }) {
  const owned = "owned" in item ? item.owned : true;

  return (
    <li>
      <Link
        href={`/casts/${item.castId}`}
        className={`profile-collection__item group block border bg-deep/70 transition-colors ${
          owned
            ? "border-[var(--color-border)] hover:border-gold/40"
            : "profile-collection__item--unowned border-[var(--color-border)]/70"
        }`}
        aria-label={owned ? `${item.name} ×${item.count}` : `${item.name}（未所持）`}
      >
        <div className="cast-card-media relative aspect-[3/4]">
          <div className="cast-card-media__media">
            <div className="cast-card-media__zoom">
              <CastPortrait src={item.image} alt={item.name} variant="cover" />
              <div className="cast-card-media__gradient" aria-hidden="true" />
            </div>
          </div>
          {owned ? (
            <span
              className="profile-collection__count absolute right-2 top-2 min-w-[2rem] border border-gold/40 bg-deep/90 px-2 py-0.5 text-center text-[11px] tracking-[0.08em] text-gold"
              aria-hidden="true"
            >
              ×{item.count}
            </span>
          ) : (
            <span
              className="profile-collection__badge profile-collection__badge--unowned absolute right-2 top-2 border border-[var(--color-border)] bg-deep/90 px-2 py-0.5 text-[10px] tracking-[0.08em] text-cream-faint"
              aria-hidden="true"
            >
              未所持
            </span>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] px-3 py-3 text-center">
          <p
            className={`font-serif-jp text-sm transition-colors ${
              owned ? "text-cream group-hover:text-gold" : "text-cream-faint"
            }`}
          >
            {item.name}
          </p>
          {item.nameEn && (
            <p className="mt-0.5 text-[10px] tracking-[0.12em] text-cream-faint uppercase">
              {item.nameEn}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function ProfileCollection({
  userKey,
  residents,
  className = "",
  headingId = "profile-collection-heading",
  showEmptyGachaLink = true,
}: ProfileCollectionProps) {
  const [entries, setEntries] = useState<GachaCollectionEntry[]>([]);
  const [sortMode, setSortMode] = useState<CollectionSortMode>("owned-first");
  const [hydrated, setHydrated] = useState(false);

  const showCatalog = Boolean(residents?.length);

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

  const catalogItems = useMemo(() => {
    if (!showCatalog || !residents) return [];
    const catalog = residents.map((resident) => ({
      id: resident.id,
      name: resident.name,
      nameEn: resident.nameEn,
      image: resident.image,
      gender: resident.gender,
    }));
    return sortCollectionDisplayItems(
      buildCollectionDisplayItems(catalog, entries),
      sortMode
    );
  }, [entries, residents, showCatalog, sortMode]);

  const groupedCatalog = useMemo(
    () => groupCollectionDisplayByGender(catalogItems),
    [catalogItems]
  );

  const groupedOwned = useMemo(() => groupGachaCollectionByGender(entries), [entries]);
  const totalOwned = getGachaCollectionTotal(entries);
  const catalogOwnedCount = catalogItems.filter((item) => item.owned).length;
  const catalogTotal = catalogItems.length;

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
        {hydrated && (showCatalog ? catalogTotal > 0 : totalOwned > 0) && (
          <p className="text-xs tracking-[0.12em] text-cream-faint">
            {showCatalog ? (
              <>
                所持{" "}
                <span className="text-cream-muted">
                  {catalogOwnedCount}/{catalogTotal}
                </span>{" "}
                種
                {totalOwned > 0 && (
                  <>
                    {" "}
                    · 合計 <span className="text-cream-muted">{totalOwned}</span> 枚
                  </>
                )}
              </>
            ) : (
              <>
                所持 <span className="text-cream-muted">{totalOwned}</span> 枚
              </>
            )}
          </p>
        )}
      </div>

      {showCatalog && hydrated && (
        <div className="profile-collection__sort mb-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-[0.08em] text-cream-faint">表示順</span>
          <div className="inline-flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const active = sortMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  aria-pressed={active}
                  className={`profile-collection__sort-btn min-h-9 px-3 text-[11px] tracking-[0.08em] transition-colors ${
                    active
                      ? "border border-gold/50 bg-gold/10 text-gold"
                      : "border border-[var(--color-border)] bg-deep/60 text-cream-muted hover:border-gold/30 hover:text-cream"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!hydrated ? (
        <p className="py-8 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : !showCatalog && entries.length === 0 ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-cream-muted">まだコレクションがありません。</p>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">
            運命の扉で★1の住人が現れると、ここに追加されます。
          </p>
          {showEmptyGachaLink && (
            <Link href="/gacha" className="btn-ghost mt-6 inline-flex min-h-11 items-center px-6">
              運命の扉へ
            </Link>
          )}
        </div>
      ) : showCatalog ? (
        <div className="space-y-10 md:space-y-12">
          {entries.length === 0 && (
            <p className="rounded border border-[var(--color-border)] bg-deep/60 px-4 py-3 text-center text-xs leading-relaxed text-cream-faint">
              まだ★1の住人カードを所持していません。グレーアウト表示は未所持の住人です。
              {showEmptyGachaLink && (
                <>
                  {" "}
                  <Link href="/gacha" className="link-gold text-gold">
                    運命の扉
                  </Link>
                  から集めましょう。
                </>
              )}
            </p>
          )}
          {GENDER_SECTIONS.map(({ key, labelEn, labelJa }) => {
            const sectionItems = groupedCatalog[key];
            const sectionOwned = sectionItems.filter((item) => item.owned).length;
            const sectionHeadingId = `${headingId}-${key}`;

            if (sectionItems.length === 0) return null;

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
                    所持{" "}
                    <span className="text-cream-muted">
                      {sectionOwned}/{sectionItems.length}
                    </span>
                  </p>
                </div>

                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5">
                  {sectionItems.map((item) => (
                    <CollectionCard key={item.castId} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-10 md:space-y-12">
          {GENDER_SECTIONS.map(({ key, labelEn, labelJa }) => {
            const sectionEntries = groupedOwned[key];
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
                      <CollectionCard key={entry.castId} item={entry} />
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
