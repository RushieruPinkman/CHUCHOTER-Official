import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { resolveDmRequestUser } from "@/lib/dm-auth";
import {
  buildUserAttachmentPathPrefix,
  uploadDmAttachment,
} from "@/lib/dm-attachments";
import { isDmStoreEnabled } from "@/lib/dm-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isDmStoreEnabled()) {
    return NextResponse.json({ error: "DM 機能が設定されていません。" }, { status: 503 });
  }

  try {
    const user = await resolveDmRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "ファイルが選択されていません。" }, { status: 400 });
    }

    const filenameEntry = formData.get("filename");
    const attachment = await uploadDmAttachment({
      file,
      filename: typeof filenameEntry === "string" ? filenameEntry : undefined,
      pathPrefix: buildUserAttachmentPathPrefix(user.userKey),
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return storageErrorResponse(error, "添付ファイルのアップロードに失敗しました");
  }
}
