import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { shouldIssueGachaSerialNumber } from "@/lib/gacha-serial";
import { getGachaSerialsForUser, issueGachaSerial } from "@/lib/gacha-serial-store";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ error: "ログイン機能が設定されていません。" }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      rarity?: number;
      source?: "draw" | "exchange";
      wonAt?: string;
      prizeTitle?: string;
      prizeSubtitle?: string | null;
      castName?: string | null;
    };

    const rarity = Number(body.rarity);
    const source = body.source === "exchange" ? "exchange" : "draw";
    const wonAt = String(body.wonAt ?? "").trim();
    const prizeTitle = String(body.prizeTitle ?? "").trim();

    if (!shouldIssueGachaSerialNumber(rarity as 1)) {
      return NextResponse.json({ error: "この結果にはシリアルNo.は不要です。" }, { status: 400 });
    }
    if (!wonAt || !prizeTitle) {
      return NextResponse.json({ error: "当選情報が不足しています。" }, { status: 400 });
    }

    const record = await issueGachaSerial({
      rarity,
      source,
      wonAt,
      userKey: buildAuthCollectionUserKey(user.id),
      prizeTitle,
      prizeSubtitle: body.prizeSubtitle ?? null,
      castName: body.castName ?? null,
    });

    return NextResponse.json({ record });
  } catch (error) {
    return storageErrorResponse(error, "シリアルNo.の発行に失敗しました");
  }
}

export async function GET(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.json({ records: [] });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const serialsParam = request.nextUrl.searchParams.get("serials") ?? "";
    const serials = serialsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (serials.length === 0) {
      return NextResponse.json({ records: [] });
    }

    const records = await getGachaSerialsForUser(serials, buildAuthCollectionUserKey(user.id));
    return NextResponse.json({ records });
  } catch (error) {
    return storageErrorResponse(error, "シリアルNo.の取得に失敗しました");
  }
}
