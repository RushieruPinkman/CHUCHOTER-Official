import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push-vapid";

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "プッシュ通知が設定されていません。" }, { status: 503 });
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID 公開鍵がありません。" }, { status: 503 });
  }

  return NextResponse.json(
    { publicKey },
    {
      headers: {
        // Public key is static; serve from CDN to avoid Function origin transfer.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
