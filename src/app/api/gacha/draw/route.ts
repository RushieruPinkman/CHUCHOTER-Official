import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { CP_GACHA_SINGLE_COST, CP_GACHA_TEN_COST } from "@/lib/cp";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import {
  completeDailyTask,
  getCpState,
  hasUsedFreeDrawToday,
  recordFreeDraw,
  spendCpForGachaDraw,
} from "@/lib/cp-store";
import { getCasts } from "@/lib/data";
import { performGachaDrawsForUser, toGachaCastSnapshots } from "@/lib/gacha-draw-server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export const runtime = "nodejs";

type GachaPayment = "free" | "cp";

export async function POST(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as { count?: number; payment?: string };
    const payment: GachaPayment = body.payment === "free" ? "free" : "cp";
    const count = body.count === 10 ? 10 : 1;

    if (payment === "free" && count !== 1) {
      return NextResponse.json({ error: "無料ガチャは1回ずつのみ引けます。" }, { status: 400 });
    }

    const stateBefore = await getCpState(user.userKey);
    if (!stateBefore.enabled) {
      return NextResponse.json(
        { error: "CP 機能が設定されていません。scripts/supabase-cp.sql を Supabase で実行してください。" },
        { status: 503 }
      );
    }

    let spent = 0;

    if (payment === "free") {
      if (await hasUsedFreeDrawToday(user.userKey)) {
        return NextResponse.json(
          { error: "本日の無料ガチャはすでに引いています。CP を使って追加で引けます。" },
          { status: 400 }
        );
      }
      await recordFreeDraw(user.userKey);
    } else {
      const cost = count === 10 ? CP_GACHA_TEN_COST : CP_GACHA_SINGLE_COST;
      if (stateBefore.balance < cost) {
        return NextResponse.json(
          {
            error: `CP が不足しています（必要: ${cost} / 所持: ${stateBefore.balance}）。デイリータスクで CP を貯めましょう。`,
          },
          { status: 400 }
        );
      }
      await spendCpForGachaDraw(user.userKey, count);
      spent = cost;
    }

    const casts = toGachaCastSnapshots(await getCasts());
    const draws = await performGachaDrawsForUser(casts, count, user.userKey);

    if (payment === "free") {
      await completeDailyTask(user.userKey, "draw_daily_gacha", "system");
    }

    const state = await getCpState(user.userKey);

    return NextResponse.json({
      draws,
      balance: state.balance,
      spent,
      payment,
      freeDrawAvailable: state.freeDrawAvailable,
    });
  } catch (error) {
    return storageErrorResponse(error, "ガチャ抽選に失敗しました");
  }
}
