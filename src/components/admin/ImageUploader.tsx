"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob, readFileAsDataUrl } from "@/lib/cropImage";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  authToken: string;
  label?: string;
}

export default function ImageUploader({
  value,
  onChange,
  authToken,
  label = "ポートレート画像",
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const openCropper = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    setError("");
    const dataUrl = await readFileAsDataUrl(file);
    setCropSrc(dataUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await openCropper(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await openCropper(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedArea) return;
    setUploading(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(cropSrc, croppedArea);
      const formData = new FormData();
      formData.append("file", blob, "cast.webp");

      const res = await fetch("/api/upload", {
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
      setCropSrc(null);
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

      {value && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[200px] overflow-hidden border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="プレビュー" className="h-full w-full object-cover" />
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-gold bg-gold/5" : "border-[var(--color-border)]"
        }`}
      >
        <p className="mb-3 text-sm text-cream-muted">
          画像をドラッグ＆ドロップ
        </p>
        <label className="btn-ghost inline-block cursor-pointer text-xs">
          ファイルを選択
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="panel w-full max-w-lg p-4 md:p-6" data-lenis-prevent>
            <h4 className="mb-4 text-gold">画像をトリミング</h4>
            <div className="relative mb-4 aspect-[3/4] w-full overflow-hidden bg-deep">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="mb-4 block text-sm text-cream-muted">
              ズーム
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-2 w-full accent-gold"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {uploading ? "保存中..." : "確定してアップロード"}
              </button>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="text-sm text-cream-muted"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
