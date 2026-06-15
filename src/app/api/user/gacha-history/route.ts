import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import {
  getGachaDrawHistoryRemote,
  isGachaHistoryStoreEnabled,
} from "@/lib/gacha-history-store";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!isGachaHistoryStoreEnabled()) {
      return NextResponse.json({ enabled: false, records: [] });
    }

    const records = await getGachaDrawHistoryRemote(user.userKey);
    return NextResponse.json({ enabled: true, records });
  } catch (error) {
    return storageErrorResponse(error, "ガチャ履歴の取得に失敗しました");
  }
}
