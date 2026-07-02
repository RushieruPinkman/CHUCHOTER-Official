import type { DmAttachmentPayload, DmMessage, DmThreadDetail, DmThreadSummary, DmUnreadSummary } from "@/lib/dm";
import { encodeDevDisplayNameHeader, readDevSession, shouldUseDevApiAuth } from "@/lib/auth-dev";

export const DM_UPDATED_EVENT = "chuchoter-dm-updated";

export function dispatchDmUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DM_UPDATED_EVENT));
}

export function buildDmRequestHeaders(userKey: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (shouldUseDevApiAuth(userKey) && userKey) {
    headers["X-Dev-User-Key"] = userKey;
    const devSession = readDevSession();
    if (devSession?.displayName?.trim()) {
      headers["X-Dev-Display-Name"] = encodeDevDisplayNameHeader(devSession.displayName);
    }
  }

  return headers;
}

export async function fetchDmUnreadSummary(userKey: string | null): Promise<DmUnreadSummary> {
  if (shouldUseDevApiAuth(userKey)) {
    return { unreadCount: 0, hasThread: false };
  }

  try {
    const response = await fetch("/api/dm?summary=1", {
      headers: buildDmRequestHeaders(userKey),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { unreadCount: 0, hasThread: false };
    }

    return (await response.json()) as DmUnreadSummary;
  } catch {
    return { unreadCount: 0, hasThread: false };
  }
}

export async function fetchUserDmThread(
  userKey: string | null
): Promise<{ thread: DmThreadSummary | null; messages: DmMessage[] }> {
  const response = await fetch("/api/dm", {
    headers: buildDmRequestHeaders(userKey),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "DM の取得に失敗しました");
  }

  return (await response.json()) as { thread: DmThreadSummary | null; messages: DmMessage[] };
}

export function buildDmUploadHeaders(userKey: string | null): HeadersInit {
  const headers: Record<string, string> = {};

  if (shouldUseDevApiAuth(userKey) && userKey) {
    headers["X-Dev-User-Key"] = userKey;
    const devSession = readDevSession();
    if (devSession?.displayName?.trim()) {
      headers["X-Dev-Display-Name"] = encodeDevDisplayNameHeader(devSession.displayName);
    }
  }

  return headers;
}

export async function uploadUserDmAttachment(
  userKey: string | null,
  file: File
): Promise<DmAttachmentPayload> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);

  const response = await fetch("/api/dm/upload", {
    method: "POST",
    headers: buildDmUploadHeaders(userKey),
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "添付ファイルのアップロードに失敗しました");
  }

  const body = (await response.json()) as { attachment: DmAttachmentPayload };
  return body.attachment;
}

export async function sendUserDmMessage(
  userKey: string | null,
  message: string,
  attachment?: DmAttachmentPayload | null
): Promise<DmThreadDetail> {
  const response = await fetch("/api/dm", {
    method: "POST",
    headers: buildDmRequestHeaders(userKey),
    body: JSON.stringify({ message, attachment: attachment ?? null }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "DM の送信に失敗しました");
  }

  dispatchDmUpdated();
  return (await response.json()) as DmThreadDetail;
}
