import { NextRequest, NextResponse } from "next/server";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { listPushSubscriptionsForUser } from "@/lib/push-store";
import { isPushConfigured } from "@/lib/push-vapid";

export async function GET(request: NextRequest) {
  const user = await resolveCpRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const subscriptions = await listPushSubscriptionsForUser(user.userKey);
  const primary = subscriptions[0] ?? null;

  return NextResponse.json({
    configured: isPushConfigured(),
    subscribed: subscriptions.length > 0,
    notifyDm: primary?.notifyDm ?? true,
    notifyBonus: primary?.notifyBonus ?? true,
    notifyGacha: primary?.notifyGacha ?? true,
  });
}
