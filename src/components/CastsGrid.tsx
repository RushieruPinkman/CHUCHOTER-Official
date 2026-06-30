"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CastPortrait from "@/components/CastPortrait";
import CastRoleBadge from "@/components/CastRoleBadge";
import GridColumnPicker, { gridColumnStyle, useGridColumnCount } from "@/components/GridColumnPicker";
import type { Cast } from "@/types";

type GenderFilter = "all" | "male" | "female";

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
];

export default function CastsGrid({ casts }: { casts: Cast[] }) {
  const { columns, setColumns, displayColumns } = useGridColumnCount(4);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  const filteredCasts = useMemo(
    () =>
      casts.filter(
        (cast) => genderFilter === "all" || (cast.gender ?? "female") === genderFilter
      ),
    [casts, genderFilter]
  );

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

          <GridColumnPicker
            columns={columns}
            displayColumns={displayColumns}
            onChange={setColumns}
          />
        </div>

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
          <div className="grid min-w-0 gap-4" style={gridColumnStyle(displayColumns)}>
            {filteredCasts.map((cast) => (
              <article key={cast.id} className="h-full min-w-0">
                <Link
                  href={`/casts/${cast.id}`}
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
                      <p className="font-display text-xl text-gold">{cast.nameEn}</p>
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
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
