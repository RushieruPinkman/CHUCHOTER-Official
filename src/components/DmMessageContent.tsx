"use client";

import type { DmMessage } from "@/lib/dm";

interface DmMessageContentProps {
  message: DmMessage;
  downloadHeaders?: HeadersInit;
}

function isDirectStorageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/dm-attachments/");
}

async function downloadAttachment(url: string, filename: string, headers?: HeadersInit) {
  // Signed Supabase URLs / local static paths: let the browser fetch storage directly
  // so file bytes never pass through Vercel Origin.
  if (isDirectStorageUrl(url) && !headers) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  const response = await fetch(url, {
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error("ダウンロードに失敗しました");
  }

  // Follow redirects to signed storage URLs without buffering through our origin path.
  if (response.redirected && isDirectStorageUrl(response.url)) {
    const anchor = document.createElement("a");
    anchor.href = response.url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export default function DmMessageContent({ message, downloadHeaders }: DmMessageContentProps) {
  const attachment = message.attachment;

  const onDownload = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (!attachment) return;

    const targetUrl =
      isDirectStorageUrl(attachment.downloadUrl) || isDirectStorageUrl(attachment.url)
        ? isDirectStorageUrl(attachment.downloadUrl)
          ? attachment.downloadUrl
          : attachment.url
        : attachment.downloadUrl;

    try {
      await downloadAttachment(
        targetUrl,
        attachment.name,
        isDirectStorageUrl(targetUrl) ? undefined : downloadHeaders
      );
    } catch {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="dm-message__content min-w-0 max-w-full space-y-2 overflow-hidden">
      {message.body.trim() && (
        <p className="dm-message__body whitespace-pre-wrap break-words">{message.body}</p>
      )}

      {attachment?.type === "image" && (
        <figure className="dm-attachment dm-attachment--image min-w-0 max-w-full overflow-hidden">
          <a
            href={attachment.downloadUrl}
            onClick={(event) => {
              event.preventDefault();
              void onDownload(event);
            }}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className="dm-attachment__image max-h-48 w-full rounded-xl object-contain md:max-h-64"
              loading="lazy"
            />
          </a>
          <figcaption className="mt-2 flex flex-wrap items-center gap-2">
            <span className="truncate text-[10px] text-cream-faint">{attachment.name}</span>
            <button type="button" onClick={onDownload} className="dm-attachment__download btn-ghost px-2 py-1 text-[10px]">
              ダウンロード
            </button>
          </figcaption>
        </figure>
      )}

      {attachment?.type === "audio" && (
        <figure className="dm-attachment dm-attachment--audio min-w-0 max-w-full overflow-hidden">
          <audio controls preload="metadata" className="dm-attachment__audio block w-full max-w-full min-w-0">
            <source src={attachment.url} type={attachment.mime} />
          </audio>
          <figcaption className="mt-2 flex flex-wrap items-center gap-2">
            <span className="truncate text-[10px] text-cream-faint">{attachment.name}</span>
            <button type="button" onClick={onDownload} className="dm-attachment__download btn-ghost px-2 py-1 text-[10px]">
              ダウンロード
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
