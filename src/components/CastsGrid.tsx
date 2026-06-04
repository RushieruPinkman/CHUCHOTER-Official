"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CastDetailModal from "@/components/CastDetailModal";
import CastPortrait from "@/components/CastPortrait";
import CastRoleBadge from "@/components/CastRoleBadge";
import type { Cast } from "@/types";

type Columns = 1 | 2 | 3 | 4 | 5 | 6;
type GenderFilter = "all" | "male" | "female";

const DESKTOP_COLUMN_OPTIONS: Columns[] = [1, 2, 3, 4, 5, 6];
const COMPACT_COLUMN_OPTIONS: Columns[] = [1, 2];

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeDesktopMedia(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getDesktopMediaSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getDesktopMediaServerSnapshot() {
  return false;
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktopMedia,
    getDesktopMediaSnapshot,
    getDesktopMediaServerSnapshot
  );
}

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
];

function ColumnIcon({ cols }: { cols: Columns }) {
  const gap = cols >= 5 ? 1 : 2;
  const barWidth = (16 - gap * (cols - 1)) / cols;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="text-current">
      {Array.from({ length: cols }).map((_, i) => (
        <rect
          key={i}
          x={1 + i * (barWidth + gap)}
          y="2"
          width={barWidth}
          height="14"
          rx="0.5"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export default function CastsGrid({ casts }: { casts: Cast[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const [columns, setColumns] = useState<Columns>(4);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);

  const displayColumns: Columns = isDesktop ? columns : columns > 2 ? 2 : columns;

  const filteredCasts = useMemo(
    () =>
      casts.filter(
        (cast) =>
          genderFilter === "all" ||
          (cast.gender ?? "female") === genderFilter
      ),
    [casts, genderFilter]
  );

  const openCast = useCallback(
    (cast: Cast) => {
      setSelectedCast(cast);
      router.replace(`/casts?cast=${cast.id}`, { scroll: false });
    },
    [router]
  );

  const closeCast = useCallback(() => {
    setSelectedCast(null);
    router.replace("/casts", { scroll: false });
  }, [router]);

  useEffect(() => {
    const castId = searchParams.get("cast");
    if (!castId) {
      setSelectedCast(null);
      return;
    }
    const cast = casts.find((c) => c.id === castId);
    if (cast) {
      setSelectedCast(cast);
      return;
    }
    setSelectedCast(null);
    router.replace("/casts", { scroll: false });
  }, [casts, searchParams, router]);

  return (
    <section className="pb-14 md:pb-16" aria-label="キャスト一覧">
      <div className="site-container">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-cream-muted">性別</p>
            <div
              className="flex flex-wrap gap-1 border border-[var(--color-border)] p-1"
              role="group"
              aria-label="性別で絞り込み"
            >
              {GENDER_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGenderFilter(value)}
                  className={`px-3 py-2 text-xs tracking-[0.08em] transition-colors md:text-sm ${
                    genderFilter === value
                      ? "bg-gold/15 text-gold"
                      : "text-cream-muted hover:text-gold"
                  }`}
                  aria-pressed={genderFilter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
            <p className="shrink-0 text-sm text-cream-muted">表示列数</p>
            <div
              className="flex max-w-full gap-1 overflow-x-auto border border-[var(--color-border)] p-1 touch-pan-x lg:hidden"
              role="group"
              aria-label="カラム数を変更"
            >
              {COMPACT_COLUMN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumns(n)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
                    displayColumns === n
                      ? "bg-gold/15 text-gold"
                      : "text-cream-muted hover:text-gold"
                  }`}
                  aria-label={`${n}列表示`}
                  aria-pressed={displayColumns === n}
                >
                  <ColumnIcon cols={n} />
                </button>
              ))}
            </div>
            <div
              className="hidden max-w-full gap-1 overflow-x-auto border border-[var(--color-border)] p-1 lg:flex"
              role="group"
              aria-label="カラム数を変更"
            >
              {DESKTOP_COLUMN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumns(n)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
                    columns === n
                      ? "bg-gold/15 text-gold"
                      : "text-cream-muted hover:text-gold"
                  }`}
                  aria-label={`${n}列表示`}
                  aria-pressed={columns === n}
                >
                  <ColumnIcon cols={n} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フィルター結果をスクリーンリーダーへ通知 */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {filteredCasts.length === 0
            ? "該当する住人がいません。"
            : `${filteredCasts.length}名の住人が表示されています。`}
        </p>

        {filteredCasts.length === 0 ? (
          <p className="py-12 text-center text-sm text-cream-muted" aria-hidden="true">
            該当する住人がいません。
          </p>
        ) : (
          <div className="grid gap-4 min-w-0" style={{ gridTemplateColumns: `repeat(${displayColumns}, minmax(0, 1fr))` }}>
            {filteredCasts.map((cast) => (
              <article key={cast.id} className="min-w-0 h-full">
                <button
                  type="button"
                  onClick={() => openCast(cast)}
                  className="group panel panel-hover flex h-full w-full flex-col overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <div className="cast-card-media aspect-[3/4] shrink-0">
                    <div className="cast-card-media__media">
                      <div className="cast-card-media__zoom">
                        <CastPortrait
                          src={cast.image}
                          alt={`${cast.name} — ${cast.tagline}`}
                        />
                        <div className="cast-card-media__gradient" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-[2] p-6">
                      <CastRoleBadge role={cast.role} className="mb-2" />
                      <p className="font-display text-xl text-gold">
                        {cast.nameEn}
                      </p>
                      <p className="text-sm text-cream-muted">{cast.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col border-t border-[var(--color-border)] p-5">
                    <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-cream-muted">
                      {cast.tagline}
                    </p>
                    <span className="mt-4 inline-block text-[11px] tracking-[0.2em] text-gold uppercase">
                      Profile →
                    </span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedCast ? <CastDetailModal cast={selectedCast} onClose={closeCast} /> : null}
    </section>
  );
}
