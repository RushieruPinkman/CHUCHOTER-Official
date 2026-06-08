"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT,
  getAllCollectionExchangeStatuses,
  performCollectionExchange,
  type CollectionExchangeRecord,
  type CollectionExchangeStatus,
  type CollectionExchangeTier,
  type ResidentCastRef,
} from "@/lib/gacha-collection-exchange";
import {
  GACHA_COLLECTION_UPDATED_EVENT,
  readGachaCollection,
} from "@/lib/gacha-collection";

interface CollectionExchangePanelProps {
  userKey: string;
  residents: ResidentCastRef[];
  className?: string;
  onExchanged?: (record: CollectionExchangeRecord) => void;
}

export default function CollectionExchangePanel({
  userKey,
  residents,
  className = "",
  onExchanged,
}: CollectionExchangePanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<CollectionExchangeTier | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const onCollectionUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey?: string }>).detail;
      if (!detail?.userKey || detail.userKey === userKey) refresh();
    };

    window.addEventListener(GACHA_COLLECTION_UPDATED_EVENT, onCollectionUpdated);
    window.addEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onCollectionUpdated);
    return () => {
      window.removeEventListener(GACHA_COLLECTION_UPDATED_EVENT, onCollectionUpdated);
      window.removeEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onCollectionUpdated);
    };
  }, [refresh, userKey]);

  const statuses = useMemo(() => {
    void refreshKey;
    const entries = readGachaCollection(userKey);
    return getAllCollectionExchangeStatuses(entries, residents);
  }, [refreshKey, residents, userKey]);

  const handleExchange = (tier: CollectionExchangeTier) => {
    setError(null);
    setPendingTier(tier);

    const result = performCollectionExchange(userKey, residents, tier);
    setPendingTier(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onExchanged?.(result.record);
    refresh();
  };

  return (
    <section
      className={`collection-exchange mx-auto max-w-3xl ${className}`.trim()}
      aria-labelledby="collection-exchange-heading"
    >
      <div className="mb-5 border-b border-[var(--color-border)] pb-4">
        <p className="section-label mb-1">Exchange</p>
        <h2 id="collection-exchange-heading" className="font-display text-xl text-gold md:text-2xl">
          コンプリート交換
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-muted">
          住人コレクションを揃えると、各カードを1枚ずつ消費して★4〜★6の景品と交換できます。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statuses.map((status) => (
          <ExchangeCard
            key={status.tier}
            status={status}
            pending={pendingTier === status.tier}
            onExchange={() => handleExchange(status.tier)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ExchangeCard({
  status,
  pending,
  onExchange,
}: {
  status: CollectionExchangeStatus;
  pending: boolean;
  onExchange: () => void;
}) {
  const progress =
    status.requiredCount > 0
      ? Math.round((status.ownedCount / status.requiredCount) * 100)
      : 0;

  return (
    <article className="collection-exchange__card flex h-full flex-col border border-[var(--color-border)] bg-deep/70 p-4">
      <p className="text-[11px] tracking-[0.18em] text-gold">{status.title}</p>
      <h3 className="mt-2 font-serif-jp text-base text-cream">{status.prizeTitle}</h3>
      <p className="mt-1 text-[11px] text-cream-faint">{status.prizeSubtitle}</p>
      <p className="mt-3 flex-1 text-xs leading-relaxed text-cream-muted">{status.description}</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-cream-faint">
          <span>{status.scopeLabel}</span>
          <span>
            {status.ownedCount}/{status.requiredCount}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden bg-[var(--color-border)]">
          <div
            className="h-full bg-gold/70 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onExchange}
        disabled={!status.canExchange || pending || status.requiredCount === 0}
        className="btn-primary mt-4 min-h-10 w-full text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "交換中…" : status.canExchange ? "交換する" : "未コンプリート"}
      </button>
    </article>
  );
}
