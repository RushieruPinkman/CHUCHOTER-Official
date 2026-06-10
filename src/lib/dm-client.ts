import type { DmAttachmentPayload, DmMessage, DmThreadDetail, DmThreadSummary, DmUnreadSummary } from "@/lib/dm";

export const DM_UPDATED_EVENT = "chuchoter-dm-updated";

export function dispatchDmUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DM_UPDATED_EVENT));
}

export function buildDmRequestHeaders(userKey: string | null, devMode: boolean): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (devMode && userKey) {
    headers["X-Dev-User-Key"] = userKey;
  }

  return headers;
}

export async function fetchDmUnreadSummary(
  userKey: string | null,
  devMode: boolean
): Promise<DmUnreadSummary> {
  const response = await fetch("/api/dm?summary=1", {
    headers: buildDmRequestHeaders(userKey, devMode),
  });

  if (!response.ok) {
    return { unreadCount: 0, hasThread: false };
  }

  return (await response.json()) as DmUnreadSummary;
}

export async function fetchUserDmThread(
  userKey: string | null,
  devMode: boolean
): Promise<{ thread: DmThreadSummary | null; messages: DmMessage[] }> {
  const response = await fetch("/api/dm", {
    headers: buildDmRequestHeaders(userKey, devMode),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "DM の取得に失敗しました");
  }

  return (await response.json()) as { thread: DmThreadSummary | null; messages: DmMessage[] };
}

export function buildDmUploadHeaders(userKey: string | null, devMode: boolean): HeadersInit {
  const headers: Record<string, string> = {};

  if (devMode && userKey) {
    headers["X-Dev-User-Key"] = userKey;
  }

  return headers;
}

export async function uploadUserDmAttachment(
  userKey: string | null,
  devMode: boolean,
  file: File
): Promise<DmAttachmentPayload> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);

  const response = await fetch("/api/dm/upload", {
    method: "POST",
    headers: buildDmUploadHeaders(userKey, devMode),
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
  devMode: boolean,
  message: string,
  attachment?: DmAttachmentPayload | null
): Promise<DmThreadDetail> {
  const response = await fetch("/api/dm", {
    method: "POST",
    headers: buildDmRequestHeaders(userKey, devMode),
    body: JSON.stringify({ message, attachment: attachment ?? null }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "DM の送信に失敗しました");
  }

  dispatchDmUpdated();
  return (await response.json()) as DmThreadDetail;
}
