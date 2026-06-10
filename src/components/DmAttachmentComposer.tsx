"use client";

import { useRef, useState } from "react";
import type { DmAttachmentPayload } from "@/lib/dm";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a,audio/aac";

interface DmAttachmentComposerProps {
  disabled?: boolean;
  pendingAttachment: DmAttachmentPayload | null;
  uploading?: boolean;
  onSelectFile: (file: File) => Promise<void>;
  onClear: () => void;
}

export default function DmAttachmentComposer({
  disabled = false,
  pendingAttachment,
  uploading = false,
  onSelectFile,
  onClear,
}: DmAttachmentComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLocalError(null);
    try {
      await onSelectFile(file);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "添付ファイルの準備に失敗しました");
    }
  };

  return (
    <div className="dm-attachment-composer space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(event) => void handleChange(event)}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-ghost min-h-10 px-3 text-xs disabled:opacity-40"
        >
          {uploading ? "アップロード中…" : "画像・音声を添付"}
        </button>
        {pendingAttachment && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={onClear}
            className="btn-ghost min-h-10 px-3 text-xs text-cream-faint disabled:opacity-40"
          >
            添付を解除
          </button>
        )}
      </div>

      {pendingAttachment && (
        <p className="text-[11px] text-cream-muted">
          添付済み: {pendingAttachment.name}（{pendingAttachment.type === "image" ? "画像" : "音声"}）
        </p>
      )}

      {localError && (
        <p className="text-[11px] text-red-300" role="alert">
          {localError}
        </p>
      )}

      <p className="text-[10px] leading-relaxed text-cream-faint">
        画像 5MB まで / 音声 10MB まで（JPEG, PNG, WebP, GIF, MP3, WAV, OGG, WebM, M4A, AAC）
      </p>
    </div>
  );
}
