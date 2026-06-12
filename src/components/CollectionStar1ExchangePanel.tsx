"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CastPortrait from "@/components/CastPortrait";
import {
  GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT,
  getStar1DuplicateExchangeCandidates,
  performStar1DuplicateExchange,
  STAR1_DUPLICATE_EXCHANGE_COST,
  type CollectionExchangeRecord,
  type ResidentCastRef,
} from "@/lib/gacha-collection-exchange";
import {
  GACHA_COLLECTION_UPDATED_EVENT,
  readGachaCollection,
} from "@/lib/gacha-collection";

interface CollectionStar1ExchangePanelProps {
  userKey: string;
  residents: ResidentCastRef[];
  className?: string;
  onExchanged?: (record: CollectionExchangeRecord) => void;
}

const EXCHANGE_PICK_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px";

function ExchangePickPortrait({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="cast-card-media relative aspect-[3/4]">
      <div className="cast-card-media__media">
        <div className="cast-card-media__zoom">
          <CastPortrait src={src} alt={alt} variant="cover" sizes={EXCHANGE_PICK_SIZES} />
          <div className="cast-card-media__gradient" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default function CollectionStar1ExchangePanel({
  userKey,
  residents,
  className = "",
  onExchanged,
}: CollectionStar1ExchangePanelProps) {
  const [duplicateCastId, setDuplicateCastId] = useState<string | null>(null);
  const [targetCastId, setTargetCastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey?: string }>).detail;
      if (!detail?.userKey || detail.userKey === userKey) refresh();
    };

    window.addEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
    window.addEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(GACHA_COLLECTION_UPDATED_EVENT, onUpdated);
      window.removeEventListener(GACHA_COLLECTION_EXCHANGE_UPDATED_EVENT, onUpdated);
    };
  }, [refresh, userKey]);

  const duplicateCandidates = useMemo(() => {
    void refreshKey;
    return getStar1DuplicateExchangeCandidates(readGachaCollection(userKey));
  }, [refreshKey, userKey]);

  useEffect(() => {
    if (duplicateCastId && !duplicateCandidates.some((item) => item.castId === duplicateCastId)) {
      setDuplicateCastId(null);
    }
  }, [duplicateCandidates, duplicateCastId]);

  useEffect(() => {
    if (targetCastId && targetCastId === duplicateCastId) {
      setTargetCastId(null);
    }
  }, [duplicateCastId, targetCastId]);

  const canExchange =
    Boolean(duplicateCastId) &&
    Boolean(targetCastId) &&
    duplicateCastId !== targetCastId &&
    !pending;

  const handleExchange = () => {
    if (!duplicateCastId || !targetCastId) return;

    setError(null);
    setPending(true);

    const result = performStar1DuplicateExchange(
      userKey,
      residents,
      duplicateCastId,
      targetCastId
    );

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDuplicateCastId(null);
    setTargetCastId(null);
    onExchanged?.(result.record);
    refresh();
  };

  return (
    <section
      className={`collection-star1-exchange mx-auto max-w-3xl ${className}`.trim()}
      aria-labelledby="collection-star1-exchange-heading"
    >
      <details className="history-disclosure">
        <summary className="history-disclosure__summary">
          <span className="history-disclosure__heading">
            <span className="section-label mb-0.5 block">Trade</span>
            <span id="collection-star1-exchange-heading" className="font-display text-xl text-gold md:text-2xl">
              ★1カード交換
            </span>
          </span>
          <span className="history-disclosure__meta">
            <span className="history-disclosure__count">
              {duplicateCandidates.length > 0
                ? `交換可 ${duplicateCandidates.length}種`
                : "条件未達"}
            </span>
            <span className="history-disclosure__chevron" aria-hidden="true" />
          </span>
        </summary>

        <div className="history-disclosure__panel">
          <p className="mb-6 text-sm leading-relaxed text-cream-muted">
            同じ★1カードを{STAR1_DUPLICATE_EXCHANGE_COST}枚消費して、好きな★1カード1枚と交換できます。
          </p>

          <div className="space-y-6">
        <div>
          <h3 className="text-sm text-cream">1. 消費するカード（{STAR1_DUPLICATE_EXCHANGE_COST}枚以上所持）</h3>
          {duplicateCandidates.length === 0 ? (
            <p className="mt-3 rounded border border-[var(--color-border)] bg-deep/60 px-4 py-5 text-center text-sm text-cream-muted">
              {STAR1_DUPLICATE_EXCHANGE_COST}枚以上重複しているカードがありません。
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {duplicateCandidates.map((candidate) => {
                const selected = duplicateCastId === candidate.castId;
                return (
                  <li key={candidate.castId}>
                    <button
                      type="button"
                      onClick={() => setDuplicateCastId(candidate.castId)}
                      aria-pressed={selected}
                      className={`collection-star1-exchange__pick w-full border bg-deep/70 text-left transition-colors ${
                        selected
                          ? "border-gold/70 ring-1 ring-gold/40"
                          : "border-[var(--color-border)] hover:border-gold/35"
                      }`}
                    >
                      <div className="relative">
                        <ExchangePickPortrait src={candidate.image} alt={candidate.name} />
                        <span className="absolute right-1.5 top-1.5 z-[1] border border-gold/40 bg-deep/90 px-1.5 py-0.5 text-[10px] text-gold">
                          ×{candidate.count}
                        </span>
                      </div>
                      <div className="border-t border-[var(--color-border)] px-2 py-2 text-center">
                        <p className="truncate font-serif-jp text-xs text-cream">{candidate.name}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm text-cream">2. 受け取るカード（好きな★1を1枚選択）</h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {residents.map((resident) => {
              const disabled = resident.id === duplicateCastId;
              const selected = targetCastId === resident.id;
              return (
                <li key={resident.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setTargetCastId(resident.id)}
                    aria-pressed={selected}
                    className={`collection-star1-exchange__pick w-full border bg-deep/70 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-gold/70 ring-1 ring-gold/40"
                        : "border-[var(--color-border)] hover:border-gold/35"
                    }`}
                  >
                    <ExchangePickPortrait src={resident.image} alt={resident.name} />
                    <div className="border-t border-[var(--color-border)] px-2 py-2 text-center">
                      <p className="truncate font-serif-jp text-xs text-cream">{resident.name}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExchange}
        disabled={!canExchange}
        className="btn-primary mt-6 min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {pending ? "交換中…" : "交換する"}
      </button>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}
        </div>
      </details>
    </section>
  );
}
