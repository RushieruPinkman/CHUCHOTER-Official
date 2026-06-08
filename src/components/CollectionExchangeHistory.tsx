"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatCollectionExchangeTimestamp,
  GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT,
  getExchangeTierRarityLabel,
  readCollectionExchangeHistory,
  type CollectionExchangeRecord,
} from "@/lib/gacha-collection-exchange";
import { GACHA_COLLECTION_UPDATED_EVENT } from "@/lib/gacha-collection";

interface CollectionExchangeHistoryProps {
  userKey: string;
  className?: string;
  onViewRecord?: (record: CollectionExchangeRecord) => void;
}

export default function CollectionExchangeHistory({
  userKey,
  className = "",
  onViewRecord,
}: CollectionExchangeHistoryProps) {
  const [records, setRecords] = useState<CollectionExchangeRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setRecords(readCollectionExchangeHistory(userKey));
  }, [userKey]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey?: string }>).detail;
      if (!detail?.userKey || detail.userKey === userKey) refresh();
    };

    window.addEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onUpdated);
    window.addEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onUpdated);
      window.removeEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
    };
  }, [refresh, userKey]);

  return (
    <section
      className={`collection-exchange-history mx-auto max-w-3xl ${className}`.trim()}
      aria-labelledby="collection-exchange-history-heading"
    >
      <div className="mb-5 border-b border-[var(--color-border)] pb-4">
        <p className="section-label mb-1">History</p>
        <h2
          id="collection-exchange-history-heading"
          className="font-display text-xl text-gold md:text-2xl"
        >
          交換履歴
        </h2>
      </div>

      {!hydrated ? (
        <p className="py-6 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : records.length === 0 ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-6 py-8 text-center">
          <p className="text-sm text-cream-muted">まだ交換履歴はありません。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li
              key={record.id}
              className="collection-exchange-history__item border border-[var(--color-border)] bg-deep/70 px-4 py-4 md:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] tracking-[0.15em] text-gold">
                    {getExchangeTierRarityLabel(record.rarity)}
                  </p>
                  <p className="mt-1 font-serif-jp text-base text-cream">{record.prizeTitle}</p>
                  <p className="mt-0.5 text-[11px] text-cream-faint">{record.prizeSubtitle}</p>
                </div>
                <time
                  dateTime={record.exchangedAt}
                  className="text-[11px] tracking-[0.08em] text-cream-faint"
                >
                  {formatCollectionExchangeTimestamp(record.exchangedAt)}
                </time>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-cream-muted">
                消費: {record.consumedCasts.map((cast) => cast.name).join("、")}
              </p>
              {onViewRecord && (
                <button
                  type="button"
                  onClick={() => onViewRecord(record)}
                  className="btn-ghost mt-4 min-h-10 px-4 text-xs"
                >
                  当選カードを見る
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
