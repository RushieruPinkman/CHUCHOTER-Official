import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveDmRequestUser } from "@/lib/dm-auth";
import { claimGachaPrize } from "@/lib/gacha-prize-claim";
import { isDmStoreEnabled } from "@/lib/dm-store";
import { isValidGachaSerialNumber, normalizeGachaSerialNumber } from "@/lib/gacha-serial";

export async function POST(request: NextRequest) {
  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "DM 機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      serial?: string;
      castId?: string;
    };

    const serial = normalizeGachaSerialNumber(String(body.serial ?? ""));
    const castId = String(body.castId ?? "").trim();

    if (!isValidGachaSerialNumber(serial)) {
      return NextResponse.json({ error: "当選情報が不正です。" }, { status: 400 });
    }
    if (!castId) {
      return NextResponse.json({ error: "キャストを選択してください。" }, { status: 400 });
    }

    const result = await claimGachaPrize({
      userKey: user.userKey,
      userDisplayName: user.displayName,
      userEmail: user.email,
      serial,
      castId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return storageErrorResponse(error, "景品の受け取りに失敗しました");
  }
}
