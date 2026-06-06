"use client";

import Image from "next/image";
import GachaPrizeTextCard from "@/components/GachaPrizeTextCard";
import { GachaRarityStars } from "@/components/GachaVfx";
import {
  getGachaPrizeCardDisplay,
  isGachaMiss,
  type GachaCastSnapshot,
  type GachaPrize,
  type GachaRarity,
} from "@/lib/gacha";

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
    const display = getGachaPrizeCardDisplay(prize, rarity);

    return (
      <div className="gacha-prize-card gacha-prize-card--miss absolute inset-0">
        <Image
          src={cast.image}
          alt={cast.name}
          fill
          sizes="(max-width: 260px) 260px, 320px"
          className="gacha-prize-card__cast-image object-cover object-center"
          priority
        />
        <div className="gacha-prize-card__miss-overlay">
          <div className="gacha-prize-card__miss-content">
            <GachaRarityStars rarity={rarity} large={showDetails} />
            <p
              className={`max-w-[90%] font-display leading-snug text-gold ${
                showDetails ? "text-base md:text-lg" : "text-sm"
              }`}
            >
              {display.primary}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`gacha-prize-card gacha-prize-card--r${rarity} absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-void`}
    >
      <GachaPrizeTextCard prize={prize} rarity={rarity} compact={!showDetails} wonAt={wonAt} />
      {rarity === 6 && <div className="gacha-prize-art__shine" aria-hidden="true" />}
    </div>
  );
}
