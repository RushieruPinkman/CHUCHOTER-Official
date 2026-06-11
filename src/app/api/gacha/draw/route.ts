import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { CP_GACHA_SINGLE_COST, CP_GACHA_TEN_COST } from "@/lib/cp";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { getCpState, spendCpForGachaDraw } from "@/lib/cp-store";
import { getCasts } from "@/lib/data";
import { performGachaDrawsForUser, toGachaCastSnapshots } from "@/lib/gacha-draw-server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as { count?: number };
    const count = body.count === 10 ? 10 : 1;
    const cost = count === 10 ? CP_GACHA_TEN_COST : CP_GACHA_SINGLE_COST;

    const stateBefore = await getCpState(user.userKey);
    if (!stateBefore.enabled) {
      return NextResponse.json(
        { error: "CP 機能が設定されていません。scripts/supabase-cp.sql を Supabase で実行してください。" },
        { status: 503 }
      );
    }
    if (stateBefore.balance < cost) {
      return NextResponse.json(
        {
          error: `CP が不足しています（必要: ${cost} / 所持: ${stateBefore.balance}）。デイリータスクで CP を貯めましょう。`,
        },
        { status: 400 }
      );
    }

    await spendCpForGachaDraw(user.userKey, count);

    const casts = toGachaCastSnapshots(await getCasts());
    const draws = await performGachaDrawsForUser(casts, count, user.userKey);
    const state = await getCpState(user.userKey);

    return NextResponse.json({ draws, balance: state.balance, spent: cost });
  } catch (error) {
    return storageErrorResponse(error, "ガチャ抽選に失敗しました");
  }
}
