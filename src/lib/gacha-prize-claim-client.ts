export interface ClaimGachaPrizeResult {
  threadId: string;
  fulfilledAutomatically: boolean;
  pendingManualFulfillment: boolean;
}

export interface ClaimGachaPrizeRequest {
  serial: string;
  castId: string;
}

export async function claimGachaPrizeFromApi(
  input: ClaimGachaPrizeRequest,
  devMode: boolean,
  userKey: string
): Promise<ClaimGachaPrizeResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (devMode && userKey) {
    headers["X-Dev-User-Key"] = userKey;
  }

  const response = await fetch("/api/gacha/prize-claim", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "景品の受け取りに失敗しました。");
  }

  return (await response.json()) as ClaimGachaPrizeResult;
}
