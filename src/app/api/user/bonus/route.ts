import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { getBonusRouletteState } from "@/lib/bonus-roulette-store";
import { resolveCpRequestUser } from "@/lib/cp-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const state = await getBonusRouletteState(user.userKey);
    return NextResponse.json(state);
  } catch (error) {
    return storageErrorResponse(error, "ボーナス情報の取得に失敗しました");
  }
}
