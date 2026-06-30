import "server-only";

import type { Cast } from "@/types";
import type { GachaCastSnapshot, GachaDrawResult } from "@/lib/gacha";
import { pickGachaPrize, RARITY_RATE } from "@/lib/gacha";
import { shouldTrackGachaPrizeSerial } from "@/lib/gacha-serial";
import { issueGachaSerial } from "@/lib/gacha-serial-store";

export function toGachaCastSnapshots(casts: Cast[]): GachaCastSnapshot[] {
  return casts
    .filter((cast) => cast.active)
    .map((cast) => ({
      id: cast.id,
      name: cast.name,
      nameEn: cast.nameEn,
      image: cast.image,
      gender: cast.gender ?? "female",
    }));
}

export async function performGachaDrawsForUser(
  casts: GachaCastSnapshot[],
  count: number,
  userKey: string
): Promise<GachaDrawResult[]> {
  const draws: GachaDrawResult[] = [];

  for (let index = 0; index < count; index++) {
    const draw = pickGachaPrize(casts, RARITY_RATE);
    if (shouldTrackGachaPrizeSerial(draw.rarity)) {
      const record = await issueGachaSerial({
        rarity: draw.rarity,
        source: "draw",
        wonAt: draw.wonAt,
        userKey,
        prizeTitle: draw.prize.title,
        prizeSubtitle: draw.prize.subtitle,
        castName: draw.cast?.name ?? null,
      });
      draws.push({
        ...draw,
        serialNumber: record.serial,
        serialStatus: record.status,
      });
    } else {
      draws.push(draw);
    }
    void index;
  }

  return draws;
}
