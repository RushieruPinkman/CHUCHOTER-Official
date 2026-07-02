import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { isBonusType } from "@/lib/bonus-period";
import { spinBonusRoulette } from "@/lib/bonus-roulette-store";
import { resolveCpRequestUser } from "@/lib/cp-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { type?: string } | null;
    const type = body?.type?.trim();

    if (!type || !isBonusType(type)) {
      return NextResponse.json({ error: "ボーナス種別が不正です。" }, { status: 400 });
    }

    const result = await spinBonusRoulette(user.userKey, type);
    return NextResponse.json(result);
  } catch (error) {
    return storageErrorResponse(error, "ルーレットの抽選に失敗しました");
  }
}
