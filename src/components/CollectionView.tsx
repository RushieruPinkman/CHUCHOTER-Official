"use client";

import { useCallback, useState } from "react";
import CollectionDevSeedPanel from "@/components/CollectionDevSeedPanel";
import CollectionExchangeHistory from "@/components/CollectionExchangeHistory";
import CollectionExchangePanel from "@/components/CollectionExchangePanel";
import CollectionStar1ExchangePanel from "@/components/CollectionStar1ExchangePanel";
import GachaResultModal from "@/components/GachaResultModal";
import ProfileCollection from "@/components/ProfileCollection";
import {
  exchangeRecordToGachaDrawResult,
  type CollectionExchangeRecord,
  type ResidentCastRef,
} from "@/lib/gacha-collection-exchange";
import type { GachaDrawResult } from "@/lib/gacha";

interface CollectionViewProps {
  userKey: string;
  residents: ResidentCastRef[];
  className?: string;
  headingId?: string;
  showEmptyGachaLink?: boolean;
  showExchange?: boolean;
}

export default function CollectionView({
  userKey,
  residents,
  className = "",
  headingId = "collection-heading",
  showEmptyGachaLink = true,
  showExchange = true,
}: CollectionViewProps) {
  const [modalResult, setModalResult] = useState<GachaDrawResult | null>(null);

  const openExchangeResult = useCallback((record: CollectionExchangeRecord) => {
    setModalResult(exchangeRecordToGachaDrawResult(record));
  }, []);

  const closeModal = useCallback(() => {
    setModalResult(null);
  }, []);

  return (
    <div className={className}>
      <ProfileCollection
        userKey={userKey}
        residents={residents}
        headingId={headingId}
        showEmptyGachaLink={showEmptyGachaLink}
      />
      <CollectionDevSeedPanel userKey={userKey} residents={residents} />
      {showExchange && (
        <>
          <CollectionStar1ExchangePanel
            userKey={userKey}
            residents={residents}
            onExchanged={openExchangeResult}
            className="mt-16 border-t border-[var(--color-border)] pt-16"
          />
          <CollectionExchangePanel
            userKey={userKey}
            residents={residents}
            onExchanged={openExchangeResult}
            className="mt-16 border-t border-[var(--color-border)] pt-16"
          />
          <CollectionExchangeHistory
            userKey={userKey}
            onViewRecord={openExchangeResult}
            className="mt-16 border-t border-[var(--color-border)] pt-16"
          />
        </>
      )}
      {modalResult && (
        <GachaResultModal
          result={modalResult}
          onClose={closeModal}
          userKey={userKey}
          titleEn="Exchange"
          titleJa="交換完了"
        />
      )}
    </div>
  );
}
