import { NextResponse } from "next/server";

export function storageErrorResponse(error: unknown, fallback = "保存に失敗しました") {
  const message = error instanceof Error ? error.message : fallback;

  let status = 500;
  if (/未設定|Supabase|本番環境では/.test(message)) status = 503;
  if (/not found|Not found/i.test(message)) status = 404;

  // Avoid logging predictable client errors — each line becomes Observability Events.
  if (status >= 500) {
    console.error("[api]", message);
  }

  return NextResponse.json({ error: message }, { status });
}

export async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}
