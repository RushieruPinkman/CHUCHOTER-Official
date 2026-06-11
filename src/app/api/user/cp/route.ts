import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { getCpState } from "@/lib/cp-store";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const state = await getCpState(user.userKey);
    return NextResponse.json(state);
  } catch (error) {
    return storageErrorResponse(error, "CP 情報の取得に失敗しました");
  }
}
