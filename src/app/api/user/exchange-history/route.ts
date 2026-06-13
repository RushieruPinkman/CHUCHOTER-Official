import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import type { CollectionExchangeRecord } from "@/lib/gacha-collection-exchange";
import {
  getCollectionExchangeHistoryRemote,
  isGachaExchangeHistoryStoreEnabled,
  saveCollectionExchangeHistoryRemote,
} from "@/lib/gacha-exchange-history-store";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

function normalizeExchangeRecords(parsed: unknown): CollectionExchangeRecord[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (record): record is CollectionExchangeRecord =>
      Boolean(
        record &&
          typeof record === "object" &&
          typeof (record as CollectionExchangeRecord).id === "string" &&
          typeof (record as CollectionExchangeRecord).exchangedAt === "string"
      )
  );
}

export async function GET(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    if (!isGachaExchangeHistoryStoreEnabled()) {
      return NextResponse.json({ enabled: false, records: [] });
    }

    const records = await getCollectionExchangeHistoryRemote(user.userKey);
    return NextResponse.json({ enabled: true, records });
  } catch (error) {
    return storageErrorResponse(error, "交換履歴の取得に失敗しました");
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

    if (!isGachaExchangeHistoryStoreEnabled()) {
      return NextResponse.json(
        {
          error:
            "交換履歴保存機能が未設定です。scripts/supabase-gacha-collection.sql を実行してください。",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { records?: unknown };
    const records = normalizeExchangeRecords(body.records);
    const saved = await saveCollectionExchangeHistoryRemote(user.userKey, records);
    return NextResponse.json({ records: saved });
  } catch (error) {
    return storageErrorResponse(error, "交換履歴の保存に失敗しました");
  }
}
