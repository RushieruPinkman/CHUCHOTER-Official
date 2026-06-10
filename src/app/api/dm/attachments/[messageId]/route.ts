import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { readDmAttachmentBuffer } from "@/lib/dm-attachments";
import { resolveDmRequestUser } from "@/lib/dm-auth";
import { getDmMessageForDownload, isDmStoreEnabled } from "@/lib/dm-store";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "DM 機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const { messageId } = await params;
    const record = await getDmMessageForDownload(decodeURIComponent(messageId));
    if (!record) {
      return NextResponse.json({ error: "メッセージが見つかりません。" }, { status: 404 });
    }

    if (record.thread.user_key !== user.userKey) {
      return NextResponse.json({ error: "アクセス権がありません。" }, { status: 403 });
    }

    if (!record.message.attachment_path || !record.message.attachment_name || !record.message.attachment_mime) {
      return NextResponse.json({ error: "添付ファイルがありません。" }, { status: 404 });
    }

    const buffer = await readDmAttachmentBuffer(record.message.attachment_path);
    if (!buffer) {
      return NextResponse.json({ error: "添付ファイルの取得に失敗しました。" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") !== "0";
    const headers: Record<string, string> = {
      "Content-Type": record.message.attachment_mime,
      "Cache-Control": "private, max-age=3600",
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(record.message.attachment_name)}`;
    } else {
      headers["Content-Disposition"] = `inline; filename*=UTF-8''${encodeURIComponent(record.message.attachment_name)}`;
    }

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch (error) {
    return storageErrorResponse(error, "添付ファイルの取得に失敗しました");
  }
}
