import "server-only";

import { promises as fs } from "fs";
import path from "path";
import {
  buildAdminAttachmentPathPrefix,
  type DmAttachmentUploadInput,
  uploadDmAttachment,
} from "@/lib/dm-attachments";

function resolveLocalPublicPath(assetUrl: string): string | null {
  if (!assetUrl.startsWith("/")) return null;
  const relative = assetUrl.replace(/^\//, "").split("?")[0]!;
  return path.join(process.cwd(), "public", relative);
}

function guessFilename(assetUrl: string, fallback: string): string {
  try {
    const parsed = assetUrl.startsWith("/")
      ? new URL(assetUrl, "http://local")
      : new URL(assetUrl);
    const basename = path.basename(parsed.pathname);
    return basename || fallback;
  } catch {
    return fallback;
  }
}

async function readAssetBlob(assetUrl: string): Promise<{ blob: Blob; filename: string }> {
  const localPath = resolveLocalPublicPath(assetUrl);
  if (localPath) {
    const buffer = await fs.readFile(localPath);
    const filename = path.basename(localPath);
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === ".webp"
        ? "image/webp"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".mp3"
              ? "audio/mpeg"
              : ext === ".wav"
                ? "audio/wav"
                : ext === ".ogg"
                  ? "audio/ogg"
                  : "application/octet-stream";
    return { blob: new Blob([buffer], { type: mime }), filename };
  }

  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`景品データの取得に失敗しました (${response.status})`);
  }

  const blob = await response.blob();
  return { blob, filename: guessFilename(assetUrl, "prize-asset") };
}

export async function copyCastPrizeAssetToDmAttachment(params: {
  assetUrl: string;
  threadId: string;
  kind: "image" | "audio";
}): Promise<DmAttachmentUploadInput> {
  const { blob, filename } = await readAssetBlob(params.assetUrl);
  return uploadDmAttachment({
    file: blob,
    filename,
    pathPrefix: buildAdminAttachmentPathPrefix(params.threadId),
  });
}
