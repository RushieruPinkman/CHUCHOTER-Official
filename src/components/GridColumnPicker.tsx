"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;

const DESKTOP_COLUMN_OPTIONS: GridColumns[] = [1, 2, 3, 4, 5, 6];
const COMPACT_COLUMN_OPTIONS: GridColumns[] = [1, 2];

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

export function useIsDesktopGrid() {
  return useSyncExternalStore(
    subscribeDesktopMedia,
    getDesktopMediaSnapshot,
    getDesktopMediaServerSnapshot
  );
}

export function useGridColumnCount(initial: GridColumns = 4) {
  const isDesktop = useIsDesktopGrid();
  const [columns, setColumns] = useState<GridColumns>(initial);
  const displayColumns: GridColumns = isDesktop ? columns : columns > 2 ? 2 : columns;

  return { columns, setColumns, displayColumns, isDesktop };
}

function ColumnIcon({ cols }: { cols: GridColumns }) {
  const gap = cols >= 5 ? 1 : 2;
  const barWidth = (16 - gap * (cols - 1)) / cols;

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="text-current">
      {Array.from({ length: cols }).map((_, index) => (
        <rect
          key={index}
          x={1 + index * (barWidth + gap)}
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

interface GridColumnPickerProps {
  columns: GridColumns;
  displayColumns: GridColumns;
  onChange: (columns: GridColumns) => void;
  className?: string;
}

export default function GridColumnPicker({
  columns,
  displayColumns,
  onChange,
  className = "",
}: GridColumnPickerProps) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap ${className}`.trim()}>
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
            onClick={() => onChange(n)}
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
            onClick={() => onChange(n)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
              columns === n ? "bg-gold/15 text-gold" : "text-cream-muted hover:text-gold"
            }`}
            aria-label={`${n}列表示`}
            aria-pressed={columns === n}
          >
            <ColumnIcon cols={n} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function gridColumnStyle(columns: GridColumns): CSSProperties {
  return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
}
