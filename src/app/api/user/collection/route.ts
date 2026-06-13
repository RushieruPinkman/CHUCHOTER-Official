import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { normalizeGachaCollectionEntries } from "@/lib/gacha-collection-merge";
import type { GachaCollectionEntry } from "@/lib/gacha-collection";
import {
  getGachaCollectionRemote,
  isGachaCollectionStoreEnabled,
  mergeAndSaveGachaCollectionRemote,
  saveGachaCollectionRemote,
} from "@/lib/gacha-collection-store";
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

    if (!isGachaCollectionStoreEnabled()) {
      return NextResponse.json({
        enabled: false,
        entries: [] as GachaCollectionEntry[],
      });
    }

    const entries = await getGachaCollectionRemote(user.userKey);
    return NextResponse.json({ enabled: true, entries });
  } catch (error) {
    return storageErrorResponse(error, "コレクションの取得に失敗しました");
  }
}

export async function PUT(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!isGachaCollectionStoreEnabled()) {
      return NextResponse.json(
        { error: "コレクション保存機能が未設定です。scripts/supabase-gacha-collection.sql を実行してください。" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { entries?: unknown; merge?: boolean };
    const entries = normalizeGachaCollectionEntries(body.entries);

    const saved = body.merge
      ? await mergeAndSaveGachaCollectionRemote(user.userKey, entries)
      : await saveGachaCollectionRemote(user.userKey, entries);

    return NextResponse.json({ entries: saved });
  } catch (error) {
    return storageErrorResponse(error, "コレクションの保存に失敗しました");
  }
}
