import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { countUnclaimedBonuses } from "@/lib/bonus-roulette-shared";
import { getBonusRouletteState } from "@/lib/bonus-roulette-store";
import { resolveDmRequestUser } from "@/lib/dm-auth";
import { getUserDmUnreadSummary, isDmStoreEnabled } from "@/lib/dm-store";

/**
 * Lightweight combined badge payload for the site header.
 * One function invocation instead of separate DM + bonus polls.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const [dm, bonusState] = await Promise.all([
      isDmStoreEnabled()
        ? getUserDmUnreadSummary(user.userKey)
        : Promise.resolve({ unreadCount: 0, hasThread: false }),
      getBonusRouletteState(user.userKey).catch(() => null),
    ]);

    return NextResponse.json({
      dmUnreadCount: dm.unreadCount,
      hasDmThread: dm.hasThread,
      bonusUnclaimedCount: countUnclaimedBonuses(bonusState),
    });
  } catch (error) {
    return storageErrorResponse(error, "バッジ情報の取得に失敗しました");
  }
}
