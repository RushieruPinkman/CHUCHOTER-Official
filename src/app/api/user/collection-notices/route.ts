import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import {
  dismissCollectionRelocationNotice,
  getPendingCollectionRelocationNotices,
  isGachaCollectionNoticesStoreEnabled,
} from "@/lib/gacha-collection-notices-store";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!isGachaCollectionNoticesStoreEnabled()) {
      return NextResponse.json({ enabled: false, notices: [] });
    }

    const notices = await getPendingCollectionRelocationNotices(user.userKey);
    return NextResponse.json({ enabled: true, notices });
  } catch (error) {
    return storageErrorResponse(error, "お知らせの取得に失敗しました");
  }
}

export async function POST(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!isGachaCollectionNoticesStoreEnabled()) {
      return NextResponse.json({ success: true });
    }

    const body = (await request.json()) as { noticeId?: string };
    if (!body.noticeId) {
      return NextResponse.json({ error: "noticeId required" }, { status: 400 });
    }

    await dismissCollectionRelocationNotice(user.userKey, body.noticeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return storageErrorResponse(error, "お知らせの更新に失敗しました");
  }
}
