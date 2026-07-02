import { NextRequest, NextResponse } from "next/server";
import { sendDailyPushReminders } from "@/lib/push-send";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyPushReminders();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
