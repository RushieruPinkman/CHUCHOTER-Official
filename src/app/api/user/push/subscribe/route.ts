import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import type { PushSubscribeRequest } from "@/lib/push-types";
import { upsertPushSubscription } from "@/lib/push-store";
import { isPushConfigured } from "@/lib/push-vapid";

export async function POST(request: NextRequest) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json({ error: "プッシュ通知が設定されていません。" }, { status: 503 });
    }

    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as PushSubscribeRequest | null;
    const endpoint = body?.endpoint?.trim();
    const p256dh = body?.keys?.p256dh?.trim();
    const auth = body?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "購読情報が不正です。" }, { status: 400 });
    }

    const subscription = await upsertPushSubscription(user.userKey, {
      endpoint,
      p256dh,
      auth,
      preferences: body?.preferences,
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    return storageErrorResponse(error, "プッシュ通知の登録に失敗しました");
  }
}
