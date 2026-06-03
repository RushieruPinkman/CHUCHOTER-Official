"use client";

import { useRef, useState } from "react";

interface VoiceUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  authToken: string;
  label?: string;
}

export default function VoiceUploader({
  value,
  onChange,
  authToken,
  label = "ボイス",
}: VoiceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|webm|m4a|aac)$/i.test(file.name)) {
      setError("音声ファイル（MP3, WAV, OGG など）を選択してください");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズは10MB以下にしてください");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("filename", file.name);

      const res = await fetch("/api/upload/voice", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Upload failed");
      }

      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "アップロードに失敗しました";
      setError(message.includes("fetch") ? "サーバーに接続できません" : message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm text-cream-muted">{label}</span>

      {value ? (
        <div className="cast-voice cast-voice--admin">
          <audio controls preload="metadata" src={value} className="cast-voice__native">
            お使いのブラウザは音声再生に対応していません。
          </audio>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-cream-muted transition-colors hover:text-red-400"
          >
            ボイスを削除
          </button>
        </div>
      ) : (
        <div className="border border-dashed border-[var(--color-border)] px-4 py-6 text-center">
          <p className="mb-3 text-sm text-cream-muted">MP3 · WAV · OGG など（最大10MB）</p>
          <label className="btn-ghost inline-block cursor-pointer text-xs">
            {uploading ? "アップロード中…" : "音声ファイルを選択"}
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
