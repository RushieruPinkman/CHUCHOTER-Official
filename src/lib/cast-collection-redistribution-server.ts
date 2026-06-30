import "server-only";

import { redistributeDeletedCastInCollection } from "@/lib/cast-collection-redistribution";
import { normalizeGachaCollectionEntries } from "@/lib/gacha-collection-merge";
import {
  appendCollectionRelocationNotice,
  isGachaCollectionNoticesStoreEnabled,
  listGachaCollectionUserRows,
} from "@/lib/gacha-collection-notices-store";
import { isGachaCollectionStoreEnabled, saveGachaCollectionRemote } from "@/lib/gacha-collection-store";
import type { Cast } from "@/types";

export async function redistributeDeletedCastForAllUsers(
  deletedCast: Cast,
  remainingCasts: Cast[]
): Promise<{ affectedUsers: number }> {
  if (!isGachaCollectionStoreEnabled() || !isGachaCollectionNoticesStoreEnabled()) {
    return { affectedUsers: 0 };
  }

  const rows = await listGachaCollectionUserRows();
  let affectedUsers = 0;

  for (const row of rows) {
    const entries = normalizeGachaCollectionEntries(row.entries);
    const { entries: nextEntries, notice } = redistributeDeletedCastInCollection(
      entries,
      deletedCast,
      remainingCasts
    );

    if (!notice) continue;

    await saveGachaCollectionRemote(row.user_key, nextEntries);
    await appendCollectionRelocationNotice(row.user_key, notice);
    affectedUsers += 1;
  }

  return { affectedUsers };
}
