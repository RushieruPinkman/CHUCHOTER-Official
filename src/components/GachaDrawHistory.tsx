"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import {
  buildGachaHistoryKey,
  formatGachaHistoryTimestamp,
  GACHA_HISTORY_UPDATED_EVENT,
  getGachaHistorySummary,
  readGachaDrawHistory,
  type GachaDrawHistoryRecord,
} from "@/lib/gacha-history";
import { getRarityLabel, type GachaDrawResult } from "@/lib/gacha";

interface GachaDrawHistoryProps {
  userKey: string | null;
  onViewResult: (result: GachaDrawResult) => void;
  loginNextPath?: string;
  className?: string;
}

function getHistoryLoginHref(nextPath: string): string {
  return getAuthLoginHref(nextPath);
}

export default function GachaDrawHistory({
  userKey,
  onViewResult,
  loginNextPath = "/gacha",
  className = "",
}: GachaDrawHistoryProps) {
  const historyKey = buildGachaHistoryKey(userKey);
  const [records, setRecords] = useState<GachaDrawHistoryRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    if (!historyKey) {
      setRecords([]);
      return;
    }
    setRecords(readGachaDrawHistory(historyKey));
  }, [historyKey]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    if (!historyKey) return;

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ historyKey?: string }>).detail;
      if (!detail?.historyKey || detail.historyKey === historyKey) refresh();
    };

    window.addEventListener(GACHA_HISTORY_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(GACHA_HISTORY_UPDATED_EVENT, onUpdated);
  }, [historyKey, refresh]);

  return (
    <section
      className={`gacha-draw-history mx-auto max-w-xl ${className}`.trim()}
      aria-labelledby="gacha-draw-history-heading"
    >
      <div className="mb-5 border-b border-[var(--color-border)] pb-4 text-center md:text-left">
        <p className="section-label mb-1">History</p>
        <h2 id="gacha-draw-history-heading" className="font-display text-xl text-gold md:text-2xl">
          ガチャ履歴
        </h2>
      </div>

      {!hydrated ? (
        <p className="py-6 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : !userKey ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-cream-muted">
            ログインすると、抽選結果がガチャ履歴に保存されます。
          </p>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">
            ★1の住人はコレクションにも追加されます。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={getHistoryLoginHref(loginNextPath)}
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
      ) : records.length === 0 ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-8 text-center">
          <p className="text-sm text-cream-muted">まだガチャ履歴はありません。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li
              key={record.id}
              className="collection-exchange-history__item border border-[var(--color-border)] bg-deep/70 px-4 py-4 md:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-left">
                  <p className="text-[11px] tracking-[0.15em] text-gold">
                    {getRarityLabel(record.result.rarity)}
                  </p>
                  <p className="mt-1 font-serif-jp text-base text-cream">
                    {getGachaHistorySummary(record.result)}
                  </p>
                  {!record.result.cast && (
                    <p className="mt-0.5 text-[11px] text-cream-faint">
                      {record.result.prize.subtitle}
                    </p>
                  )}
                </div>
                <time
                  dateTime={record.result.wonAt}
                  className="text-[11px] tracking-[0.08em] text-cream-faint"
                >
                  {formatGachaHistoryTimestamp(record.result.wonAt)}
                </time>
              </div>
              <button
                type="button"
                onClick={() => onViewResult(record.result)}
                className="btn-ghost mt-4 min-h-10 px-4 text-xs"
              >
                結果を見る
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
