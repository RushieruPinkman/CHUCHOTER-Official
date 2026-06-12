"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isGachaDevEnabled } from "@/lib/gacha-dev";
import type { ResidentCastRef } from "@/lib/gacha-collection-exchange";
import { incrementGachaCollectionCasts } from "@/lib/gacha-collection";

const DEV_SEED_AMOUNT = 10;
const DEV_SEED_QUERY = "seedCollection";

interface CollectionDevSeedPanelProps {
  userKey: string;
  residents: ResidentCastRef[];
}

export default function CollectionDevSeedPanel({ userKey, residents }: CollectionDevSeedPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const autoSeededRef = useRef(false);

  const seedCollection = useCallback(() => {
    const catalog = residents.map((resident) => ({
      id: resident.id,
      name: resident.name,
      nameEn: resident.nameEn,
      image: resident.image,
      gender: resident.gender,
    }));
    incrementGachaCollectionCasts(userKey, catalog, DEV_SEED_AMOUNT);
    setMessage(`全${residents.length}種のカードをそれぞれ${DEV_SEED_AMOUNT}枚追加しました。`);
  }, [residents, userKey]);

  useEffect(() => {
    if (!isGachaDevEnabled() || autoSeededRef.current || residents.length === 0) return;
    if (new URLSearchParams(window.location.search).get(DEV_SEED_QUERY) !== "1") return;

    autoSeededRef.current = true;
    seedCollection();
  }, [residents.length, seedCollection]);

  if (!isGachaDevEnabled()) return null;

  return (
    <div className="mx-auto mt-6 max-w-3xl rounded border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-center">
      <p className="text-[11px] leading-relaxed text-amber-100/90">
        開発用 — 交換テスト向けにコレクションへカードを追加できます（localStorage のみ）。
      </p>
      <button
        type="button"
        onClick={seedCollection}
        className="btn-ghost mt-3 min-h-10 px-4 text-xs text-amber-100"
      >
        全キャスト +{DEV_SEED_AMOUNT}枚
      </button>
      {message && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-100/90" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
