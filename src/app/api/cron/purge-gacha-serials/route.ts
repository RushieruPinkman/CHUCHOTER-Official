import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredGachaSerials } from "@/lib/gacha-serial-store";

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
    const result = await purgeExpiredGachaSerials();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
