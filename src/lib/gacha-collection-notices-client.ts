import type { CollectionRelocationNotice } from "@/lib/cast-collection-redistribution";
import { buildUserRequestHeadersForApi } from "@/lib/gacha-collection-client";

export async function fetchPendingCollectionRelocationNotices(): Promise<
  CollectionRelocationNotice[]
> {
  const response = await fetch("/api/user/collection-notices", {
    headers: await buildUserRequestHeadersForApi(),
    cache: "no-store",
  });

  if (response.status === 401) return [];
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "お知らせの取得に失敗しました");
  }

  const body = (await response.json()) as {
    enabled?: boolean;
    notices?: CollectionRelocationNotice[];
  };

  if (!body.enabled) return [];
  return Array.isArray(body.notices) ? body.notices : [];
}

export async function dismissCollectionRelocationNoticeClient(
  noticeId: string
): Promise<void> {
  const response = await fetch("/api/user/collection-notices", {
    method: "POST",
    headers: await buildUserRequestHeadersForApi(),
    body: JSON.stringify({ noticeId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "お知らせの更新に失敗しました");
  }
}
