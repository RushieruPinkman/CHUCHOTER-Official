"use client";

import { useCallback, useEffect, useState } from "react";
import HistoryDisclosure from "@/components/HistoryDisclosure";
import {
  clearCollectionExchangeHistory,
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

  const handleClear = useCallback(() => {
    clearCollectionExchangeHistory(userKey);
    refresh();
  }, [refresh, userKey]);

  return (
    <HistoryDisclosure
      id="collection-exchange-history"
      labelEn="History"
      labelJa="交換履歴"
      count={records.length}
      showClear={records.length > 0}
      clearTitleJa="交換履歴を削除"
      clearMessage="保存されている交換履歴をすべて削除します。この操作は取り消せません。"
      onClear={handleClear}
      className={`collection-exchange-history mx-auto max-w-3xl ${className}`.trim()}
    >
      {!hydrated ? (
        <p className="py-4 text-center text-sm text-cream-faint" role="status">
          読み込み中…
        </p>
      ) : records.length === 0 ? (
        <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-5 py-6 text-center">
          <p className="text-sm text-cream-muted">まだ交換履歴はありません。</p>
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
                  {getExchangeTierRarityLabel(record.rarity)}
                </p>
                <time
                  dateTime={record.exchangedAt}
                  className="text-[11px] tracking-[0.08em] text-cream-faint"
                >
                  {formatCollectionExchangeTimestamp(record.exchangedAt)}
                </time>
              </div>
              <div className="history-record-item__main">
                <div className="history-record-item__text">
                  <p className="font-serif-jp text-base text-cream">{record.prizeTitle}</p>
                  <p className="mt-0.5 text-[11px] text-cream-faint">{record.prizeSubtitle}</p>
                </div>
                {onViewRecord && (
                  <button
                    type="button"
                    onClick={() => onViewRecord(record)}
                    className="history-record-item__action btn-ghost px-3 text-xs"
                  >
                    当選カードを見る
                  </button>
                )}
              </div>
              <p className="history-record-item__note text-xs leading-relaxed text-cream-muted">
                消費:{" "}
                {record.consumedCasts
                  .map((cast) =>
                    cast.quantity && cast.quantity > 1 ? `${cast.name} ×${cast.quantity}` : cast.name
                  )
                  .join("、")}
                {record.receivedCast ? ` / 獲得: ${record.receivedCast.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </HistoryDisclosure>
  );
}
