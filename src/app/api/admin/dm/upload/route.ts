import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { storageErrorResponse } from "@/lib/api-error";
import {
  buildAdminAttachmentPathPrefix,
  uploadDmAttachment,
} from "@/lib/dm-attachments";
import { isDmStoreEnabled } from "@/lib/dm-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "Supabase が未設定です。" }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const threadId = String(formData.get("threadId") ?? request.nextUrl.searchParams.get("threadId") ?? "").trim();

    if (!threadId) {
      return NextResponse.json({ error: "スレッドIDが必要です。" }, { status: 400 });
    }

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "ファイルが選択されていません。" }, { status: 400 });
    }

    const filenameEntry = formData.get("filename");
    const attachment = await uploadDmAttachment({
      file,
      filename: typeof filenameEntry === "string" ? filenameEntry : undefined,
      pathPrefix: buildAdminAttachmentPathPrefix(threadId),
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return storageErrorResponse(error, "添付ファイルのアップロードに失敗しました");
  }
}
