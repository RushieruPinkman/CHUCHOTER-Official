import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { storageErrorResponse } from "@/lib/api-error";
import { getDmSettings, saveDmSettings } from "@/lib/data";
import { sendDiscordDmTestWebhook } from "@/lib/dm-discord";
import { revalidateSiteContent } from "@/lib/revalidate-site";
import {
  getAdminDmThreadDetail,
  getTotalAdminUnreadCount,
  isDmStoreEnabled,
  listAdminDmThreads,
  markThreadReadByAdmin,
  sendAdminDmMessage,
} from "@/lib/dm-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "Supabase が未設定です。" }, { status: 503 });
  }

  try {
    const threadId = request.nextUrl.searchParams.get("threadId")?.trim();
    if (threadId) {
      const detail = await getAdminDmThreadDetail(threadId);
      if (!detail) {
        return NextResponse.json({ error: "DM スレッドが見つかりません。" }, { status: 404 });
      }
      await markThreadReadByAdmin(threadId);
      detail.thread.adminUnreadCount = 0;
      return NextResponse.json(detail);
    }

    const threads = await listAdminDmThreads();
    const unreadTotal = await getTotalAdminUnreadCount();
    const settings = await getDmSettings();

    return NextResponse.json({ threads, unreadTotal, settings });
  } catch (error) {
    return storageErrorResponse(error, "DM の取得に失敗しました");
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "Supabase が未設定です。" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      threadId?: string;
      message?: string;
      discordWebhookUrl?: string;
    };

    if (body.action === "save_settings") {
      const settings = {
        discordWebhookUrl: String(body.discordWebhookUrl ?? "").trim(),
      };
      await saveDmSettings(settings);
      revalidateSiteContent();
      return NextResponse.json({ settings });
    }

    if (body.action === "test_webhook") {
      const result = await sendDiscordDmTestWebhook(
        String(body.discordWebhookUrl ?? "").trim() || undefined
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.detail }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const threadId = String(body.threadId ?? "").trim();
    if (!threadId) {
      return NextResponse.json({ error: "スレッドIDが必要です。" }, { status: 400 });
    }

    const detail = await sendAdminDmMessage(threadId, String(body.message ?? ""));
    return NextResponse.json(detail);
  } catch (error) {
    return storageErrorResponse(error, "DM の更新に失敗しました");
  }
}
