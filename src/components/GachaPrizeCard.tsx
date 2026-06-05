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
}

export default function GachaPrizeCard({
  prize,
  rarity,
  cast,
  showDetails = true,
  wonAt,
}: GachaPrizeCardProps) {
  if (isGachaMiss(rarity) && cast) {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className={`relative min-h-0 flex-1 overflow-hidden bg-void gacha-prize-card--r${rarity} gacha-prize-card--miss`}>
          <Image
            src={cast.image}
            alt={cast.name}
            fill
            sizes="(max-width: 260px) 260px, 320px"
            className="gacha-prize-card__cast-image object-cover object-top"
            priority
          />
          <div className="gacha-prize-card__miss-overlay">
            <GachaRarityStars rarity={rarity} large={showDetails} />
            <p className={`font-display text-cream ${showDetails ? "mt-3 text-xl" : "mt-2 text-lg"}`}>
              {prize.title}
            </p>
            <p className={`text-gold ${showDetails ? "text-sm" : "text-xs"}`}>{cast.name}</p>
            {showDetails && (
              <p className="mt-1 text-xs leading-relaxed text-cream-faint">{prize.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`relative min-h-0 flex-1 overflow-hidden bg-void gacha-prize-card--r${rarity}`}>
        <GachaPrizeTextCard prize={prize} rarity={rarity} compact={!showDetails} wonAt={wonAt} />
        {rarity === 6 && <div className="gacha-prize-art__shine" aria-hidden="true" />}
      </div>
    </div>
  );
}
