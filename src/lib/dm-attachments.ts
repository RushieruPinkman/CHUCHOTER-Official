import "server-only";

import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { getMissingSupabaseEnvVars, getSupabaseAdmin } from "@/lib/supabase-admin";
import type { DmAttachmentKind, DmMessageAttachment } from "@/lib/dm";

export const DM_ATTACHMENTS_BUCKET = "dm-attachments";
export const DM_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const DM_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;


const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const AUDIO_MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

export interface DmAttachmentUploadInput {
  type: DmAttachmentKind;
  path: string;
  name: string;
  mime: string;
}

function createAttachmentId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 120) || "attachment";
}

function resolveAttachmentKind(file: Blob, filename?: string): DmAttachmentKind | null {
  if (IMAGE_MIME_TO_EXT[file.type]) return "image";
  if (AUDIO_MIME_TO_EXT[file.type]) return "audio";

  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    if (ext && ["mp3", "wav", "ogg", "webm", "m4a", "aac"].includes(ext)) return "audio";
  }

  return null;
}

function resolveExtension(kind: DmAttachmentKind, file: Blob, filename?: string): string | null {
  if (kind === "image") {
    return IMAGE_MIME_TO_EXT[file.type] ?? filename?.split(".").pop()?.toLowerCase() ?? null;
  }

  return AUDIO_MIME_TO_EXT[file.type] ?? filename?.split(".").pop()?.toLowerCase() ?? null;
}

function getMaxBytes(kind: DmAttachmentKind): number {
  return kind === "image" ? DM_IMAGE_MAX_BYTES : DM_AUDIO_MAX_BYTES;
}

function getLocalAttachmentPath(storagePath: string): string {
  return path.join(process.cwd(), "public", "dm-attachments", storagePath);
}

async function writeLocalAttachment(storagePath: string, buffer: Buffer): Promise<string> {
  const fullPath = getLocalAttachmentPath(storagePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return `/dm-attachments/${storagePath.replace(/\\/g, "/")}`;
}

async function processImageBuffer(
  buffer: Buffer,
  mime: string
): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  if (mime === "image/gif") {
    return { buffer, mime, ext: "gif" };
  }

  const processed = await sharp(buffer)
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return { buffer: processed, mime: "image/webp", ext: "webp" };
}

export function buildDmAttachmentPreview(
  body: string,
  attachment?: Pick<DmMessageAttachment, "type"> | null
): string {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (attachment?.type === "image") return "[画像]";
  if (attachment?.type === "audio") return "[音声]";
  return "";
}

export function buildUserAttachmentPathPrefix(userKey: string): string {
  return `${userKey.replace(/[^a-zA-Z0-9:_-]/g, "_")}/`;
}

export function buildAdminAttachmentPathPrefix(threadId: string): string {
  return `thread-${threadId.replace(/[^a-zA-Z0-9:_-]/g, "_")}/`;
}

export function isAttachmentPathAllowed(pathValue: string, allowedPrefix: string): boolean {
  return pathValue.startsWith(allowedPrefix) && !pathValue.includes("..");
}

export async function uploadDmAttachment(params: {
  file: Blob;
  filename?: string;
  pathPrefix: string;
  /** true のとき画像を WebP 変換せず元ファイルのまま保存 */
  preserveOriginal?: boolean;
}): Promise<DmAttachmentUploadInput> {
  const kind = resolveAttachmentKind(params.file, params.filename);
  if (!kind) {
    throw new Error("対応形式: JPEG, PNG, WebP, GIF, MP3, WAV, OGG, WebM, M4A, AAC");
  }

  if (params.file.size > getMaxBytes(kind)) {
    throw new Error(
      kind === "image" ? "画像は10MB以下にしてください。" : "音声ファイルは10MB以下にしてください。"
    );
  }

  const ext = resolveExtension(kind, params.file, params.filename);
  if (!ext) {
    throw new Error("ファイル形式を判別できませんでした。");
  }

  const rawBuffer = Buffer.from(await params.file.arrayBuffer());
  const processed =
    kind === "image" && !params.preserveOriginal
      ? await processImageBuffer(rawBuffer, params.file.type || `image/${ext}`)
      : {
          buffer: rawBuffer,
          mime: params.file.type || (kind === "image" ? `image/${ext}` : `audio/${ext === "mp3" ? "mpeg" : ext}`),
          ext,
        };

  const storagePath = `${params.pathPrefix}${createAttachmentId()}.${processed.ext}`;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.storage.from(DM_ATTACHMENTS_BUCKET).upload(storagePath, processed.buffer, {
      contentType: processed.mime,
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
        throw new Error(
          "dm-attachments バケットがありません。Supabase で scripts/supabase-dm-attachments.sql を実行してください。"
        );
      }
      throw new Error(`添付ファイルの保存に失敗しました: ${error.message}`);
    }
  } else if (process.env.VERCEL === "1") {
    const missing = getMissingSupabaseEnvVars();
    throw new Error(
      missing.length > 0
        ? `Supabase が未設定です（${missing.join(" / ")}）。`
        : "本番環境では Supabase ストレージが必要です。"
    );
  } else {
    await writeLocalAttachment(storagePath, processed.buffer);
  }

  return {
    type: kind,
    path: storagePath,
    name: sanitizeFilename(params.filename ?? `attachment.${processed.ext}`),
    mime: processed.mime,
  };
}

export async function resolveDmAttachmentAccessUrl(
  storagePath: string,
  options: { download?: string | boolean } = {}
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.storage
      .from(DM_ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
        download: options.download,
      });

    if (error || !data?.signedUrl) {
      console.error("[dm-attachments] signed url failed:", error?.message);
      return null;
    }

    return data.signedUrl;
  }

  const localPath = getLocalAttachmentPath(storagePath);
  try {
    await fs.access(localPath);
    return `/dm-attachments/${storagePath.replace(/\\/g, "/")}`;
  } catch {
    return null;
  }
}

export async function readDmAttachmentBuffer(storagePath: string): Promise<Buffer | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.storage.from(DM_ATTACHMENTS_BUCKET).download(storagePath);
    if (error || !data) {
      console.error("[dm-attachments] download failed:", error?.message);
      return null;
    }
    return Buffer.from(await data.arrayBuffer());
  }

  try {
    return await fs.readFile(getLocalAttachmentPath(storagePath));
  } catch {
    return null;
  }
}

export async function resolveDmMessageAttachment(
  messageId: string,
  row: {
    attachment_type: DmAttachmentKind | null;
    attachment_path: string | null;
    attachment_name: string | null;
    attachment_mime: string | null;
  },
  downloadBasePath: string
): Promise<DmMessageAttachment | null> {
  if (!row.attachment_type || !row.attachment_path || !row.attachment_name || !row.attachment_mime) {
    return null;
  }

  const url = await resolveDmAttachmentAccessUrl(row.attachment_path);
  if (!url) return null;

  let downloadUrl = `${downloadBasePath}/${encodeURIComponent(messageId)}`;
  if (url.startsWith("http")) {
    downloadUrl =
      (await resolveDmAttachmentAccessUrl(row.attachment_path, {
        download: row.attachment_name,
      })) ?? url;
  } else if (url.startsWith("/")) {
    downloadUrl = url;
  }

  return {
    type: row.attachment_type,
    path: row.attachment_path,
    name: row.attachment_name,
    mime: row.attachment_mime,
    url,
    downloadUrl,
  };
}

export async function deleteDmAttachmentStorage(paths: string[]): Promise<number> {
  const uniquePaths = [...new Set(paths.map((value) => value.trim()).filter(Boolean))];
  if (uniquePaths.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  let deleted = 0;

  if (supabase) {
    const { error } = await supabase.storage.from(DM_ATTACHMENTS_BUCKET).remove(uniquePaths);
    if (error) {
      console.error("[dm-attachments] storage delete failed:", error.message);
    } else {
      deleted += uniquePaths.length;
    }
  }

  if (!supabase || process.env.VERCEL !== "1") {
    for (const storagePath of uniquePaths) {
      try {
        await fs.unlink(getLocalAttachmentPath(storagePath));
        deleted += 1;
      } catch {
        /* 既に無い場合は無視 */
      }
    }
  }

  return deleted;
}
