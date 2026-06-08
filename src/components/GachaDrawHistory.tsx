"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import HistoryDisclosure from "@/components/HistoryDisclosure";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import {
  buildGachaHistoryKey,
  clearGachaDrawHistory,
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

  const handleClear = useCallback(() => {
    if (!historyKey) return;
    clearGachaDrawHistory(historyKey);
    refresh();
  }, [historyKey, refresh]);

  return (
    <HistoryDisclosure
      id="gacha-draw-history"
      labelEn="History"
      labelJa="ガチャ履歴"
      count={records.length}
      showClear={Boolean(userKey && records.length > 0)}
      clearTitleJa="ガチャ履歴を削除"
      clearMessage="保存されているガチャ履歴をすべて削除します。この操作は取り消せません。"
      onClear={historyKey ? handleClear : undefined}
      className={`gacha-draw-history mx-auto max-w-xl ${className}`.trim()}
    >
        {!hydrated ? (
          <p className="py-4 text-center text-sm text-cream-faint" role="status">
            読み込み中…
          </p>
        ) : !userKey ? (
          <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-5 py-6 text-center">
            <p className="text-sm leading-relaxed text-cream-muted">
              ログインすると、抽選結果がガチャ履歴に保存されます。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-cream-faint">
              ★1の住人はコレクションにも追加されます。最新5件まで保存され、それ以降は自動的に削除されます。
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={getAuthLoginHref(loginNextPath)}
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
          <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-5 py-6 text-center">
            <p className="text-sm text-cream-muted">まだガチャ履歴はありません。</p>
            <p className="mt-2 text-xs text-cream-faint">最新5件まで保存されます。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li
                key={record.id}
                className="history-record-item collection-exchange-history__item border border-[var(--color-border)] bg-deep/70 px-4 py-4 md:px-5"
              >
                <div className="history-record-item__meta">
                  <p className="text-[11px] tracking-[0.15em] text-gold">
                    {getRarityLabel(record.result.rarity)}
                  </p>
                  <time
                    dateTime={record.result.wonAt}
                    className="text-[11px] tracking-[0.08em] text-cream-faint"
                  >
                    {formatGachaHistoryTimestamp(record.result.wonAt)}
                  </time>
                </div>
                <div className="history-record-item__main">
                  <div className="history-record-item__text">
                    <p className="font-serif-jp text-base text-cream">
                      {getGachaHistorySummary(record.result)}
                    </p>
                    {!record.result.cast && (
                      <p className="mt-0.5 text-[11px] text-cream-faint">
                        {record.result.prize.subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewResult(record.result)}
                    className="history-record-item__action btn-ghost px-3 text-xs"
                  >
                    結果を見る
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </HistoryDisclosure>
  );
}
