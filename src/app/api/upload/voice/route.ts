import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAdminPassword } from "@/lib/data";
import { getMissingSupabaseEnvVars, getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "cast-voices";

const EXT_BY_MIME: Record<string, string> = {
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

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === (await getAdminPassword());
}

function resolveExtension(file: Blob, filename?: string): string | null {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;

  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext && ["mp3", "wav", "ogg", "webm", "m4a", "aac"].includes(ext)) return ext;
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const originalName = formData.get("filename");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "音声ファイルが選択されていません" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 });
    }

    const ext = resolveExtension(file, typeof originalName === "string" ? originalName : undefined);
    if (!ext) {
      return NextResponse.json(
        { error: "対応形式: MP3, WAV, OGG, WebM, M4A, AAC" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `voice-${Date.now()}.${ext}`;
    const contentType = file.type || `audio/${ext === "mp3" ? "mpeg" : ext}`;
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });

      if (error) {
        console.error("[upload/voice] Supabase storage error:", error.message);
        return NextResponse.json(
          {
            error:
              error.message.includes("Bucket not found") || error.message.includes("not found")
                ? "cast-voices バケットがありません。Supabase で scripts/supabase-setup.sql を実行してください。"
                : `音声の保存に失敗しました: ${error.message}`,
          },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(filename);

      return NextResponse.json({ url: publicUrl });
    }

    if (process.env.VERCEL === "1") {
      const missing = getMissingSupabaseEnvVars();
      return NextResponse.json(
        {
          error:
            missing.length > 0
              ? `Supabase が未設定です（${missing.join(" / ")}）。Vercel の環境変数を設定して再デプロイしてください。`
              : "本番環境では Supabase ストレージが必要です。",
        },
        { status: 503 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "audio", "casts");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    return NextResponse.json({ url: `/audio/casts/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload/voice] Failed:", message);
    return NextResponse.json({ error: `アップロードに失敗しました: ${message}` }, { status: 500 });
  }
}
