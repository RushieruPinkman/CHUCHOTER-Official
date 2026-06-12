"use client";

import { useRef, useState } from "react";
import type { DmAttachmentPayload } from "@/lib/dm";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a,audio/aac";

interface DmAttachmentComposerProps {
  disabled?: boolean;
  pendingAttachment: DmAttachmentPayload | null;
  uploading?: boolean;
  compact?: boolean;
  variant?: "default" | "toolbar";
  onSelectFile: (file: File) => Promise<void>;
  onClear: () => void;
}

function AttachIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 6.5v8.75a4.75 4.75 0 0 1-9.5 0V5.5a3.25 3.25 0 0 1 6.5 0v8.25a2 2 0 0 1-4 0V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DmAttachmentComposer({
  disabled = false,
  pendingAttachment,
  uploading = false,
  compact = false,
  variant = "default",
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

  if (variant === "toolbar") {
    return (
      <div className="dm-attachment-composer dm-attachment-composer--toolbar">
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
          className="dm-composer__attach-btn"
          aria-label={uploading ? "アップロード中" : "画像・音声を添付"}
          title={uploading ? "アップロード中…" : "画像・音声を添付"}
        >
          {uploading ? (
            <span className="dm-composer__attach-spinner" aria-hidden="true" />
          ) : (
            <AttachIcon />
          )}
        </button>
        {localError && (
          <p className="sr-only" role="alert">
            {localError}
          </p>
        )}
      </div>
    );
  }

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

      <p className={`text-[10px] leading-relaxed text-cream-faint ${compact ? "hidden md:block" : ""}`}>
        画像 5MB まで / 音声 10MB まで（JPEG, PNG, WebP, GIF, MP3, WAV, OGG, WebM, M4A, AAC）
      </p>
    </div>
  );
}
