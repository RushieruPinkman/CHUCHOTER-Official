import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveDmRequestUser } from "@/lib/dm-auth";
import { notifyDiscordDmMessage } from "@/lib/dm-discord";
import {
  getUserDmThreadDetail,
  getUserDmUnreadSummary,
  isDmStoreEnabled,
  markThreadReadByUser,
  sendUserDmMessage,
} from "@/lib/dm-store";

export async function GET(request: NextRequest) {
  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "DM 機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const summaryOnly = request.nextUrl.searchParams.get("summary") === "1";
    if (summaryOnly) {
      const summary = await getUserDmUnreadSummary(user.userKey);
      return NextResponse.json(summary);
    }

    const detail = await getUserDmThreadDetail(user.userKey);
    if (detail) {
      await markThreadReadByUser(detail.thread.id, user.userKey);
      detail.thread.userUnreadCount = 0;
    }

    return NextResponse.json({
      thread: detail?.thread ?? null,
      messages: detail?.messages ?? [],
    });
  } catch (error) {
    return storageErrorResponse(error, "DM の取得に失敗しました");
  }
}

export async function POST(request: NextRequest) {
  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "DM 機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as { message?: string };
    const detail = await sendUserDmMessage(
      user.userKey,
      String(body.message ?? ""),
      user.displayName,
      user.email
    );

    await notifyDiscordDmMessage({
      userDisplayName: user.displayName,
      userEmail: user.email,
      body: detail.messages.at(-1)?.body ?? "",
      threadId: detail.thread.id,
    });

    return NextResponse.json(detail);
  } catch (error) {
    return storageErrorResponse(error, "DM の送信に失敗しました");
  }
}
