import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { storageErrorResponse } from "@/lib/api-error";
import {
  readDmAttachmentBuffer,
  resolveDmAttachmentAccessUrl,
} from "@/lib/dm-attachments";
import { getDmMessageForDownload, isDmStoreEnabled } from "@/lib/dm-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Redirect to Supabase signed URL — avoid streaming attachment bytes via Vercel Origin. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "Supabase が未設定です。" }, { status: 503 });
  }

  try {
    const { messageId } = await params;
    const record = await getDmMessageForDownload(decodeURIComponent(messageId));
    if (!record) {
      return NextResponse.json({ error: "メッセージが見つかりません。" }, { status: 404 });
    }

    if (!record.message.attachment_path || !record.message.attachment_name || !record.message.attachment_mime) {
      return NextResponse.json({ error: "添付ファイルがありません。" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") !== "0";
    const signedUrl = await resolveDmAttachmentAccessUrl(record.message.attachment_path, {
      download: download ? record.message.attachment_name : undefined,
    });

    if (signedUrl?.startsWith("http")) {
      return NextResponse.redirect(signedUrl, 302);
    }

    if (signedUrl?.startsWith("/")) {
      return NextResponse.redirect(new URL(signedUrl, request.url), 302);
    }

    const buffer = await readDmAttachmentBuffer(record.message.attachment_path);
    if (!buffer) {
      return NextResponse.json({ error: "添付ファイルの取得に失敗しました。" }, { status: 404 });
    }

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
