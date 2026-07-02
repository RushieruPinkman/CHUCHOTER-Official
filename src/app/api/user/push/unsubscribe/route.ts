import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { deletePushSubscription } from "@/lib/push-store";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
    const endpoint = body?.endpoint?.trim();
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint が必要です。" }, { status: 400 });
    }

    await deletePushSubscription(user.userKey, endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageErrorResponse(error, "プッシュ通知の解除に失敗しました");
  }
}
