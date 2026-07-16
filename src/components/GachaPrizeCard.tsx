"use client";

import Image from "next/image";
import GachaPrizeTextCard from "@/components/GachaPrizeTextCard";
import { GachaRarityStars } from "@/components/GachaVfx";
import { isGachaMiss, type GachaCastSnapshot, type GachaPrize, type GachaRarity } from "@/lib/gacha";

interface GachaPrizeCardProps {
  prize: GachaPrize;
  rarity: GachaRarity;
  cast?: GachaCastSnapshot;
  showDetails?: boolean;
  wonAt?: string;
  serialNumber?: string;
  serialStatus?: import("@/lib/gacha-serial").GachaSerialStatus;
}

export default function GachaPrizeCard({
  prize,
  rarity,
  cast,
  showDetails = true,
  wonAt,
  serialNumber,
  serialStatus,
}: GachaPrizeCardProps) {
  if (isGachaMiss(rarity) && cast) {
    return (
      <div className="gacha-prize-card gacha-prize-card--miss absolute inset-0">
        <Image
          src={cast.image}
          alt={cast.name}
          fill
          unoptimized
          sizes="(max-width: 260px) 260px, 320px"
          className="gacha-prize-card__cast-image object-cover object-top"
          priority
        />
        <div className="gacha-prize-card__miss-overlay">
          <div className="gacha-prize-card__miss-content">
            <GachaRarityStars rarity={rarity} large={showDetails} />
            <p className={`font-display text-gold ${showDetails ? "text-xl" : "text-lg"}`}>
              {cast.name}
            </p>
            <p className={`text-cream-muted tracking-widest ${showDetails ? "text-xs" : "text-[10px]"}`}>
              {cast.nameEn}
            </p>
            {showDetails && (
              <p className="text-xs leading-relaxed text-cream-faint">{prize.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`gacha-prize-card gacha-prize-card--r${rarity} absolute inset-0 flex flex-col overflow-hidden bg-void`}>
      <GachaPrizeTextCard
        prize={prize}
        rarity={rarity}
        compact={!showDetails}
        wonAt={wonAt}
        serialNumber={serialNumber}
        serialStatus={serialStatus}
      />
      {rarity === 6 && <div className="gacha-prize-art__shine" aria-hidden="true" />}
    </div>
  );
}
