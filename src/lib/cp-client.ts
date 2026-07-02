import type { CpState, DailyTaskId } from "@/lib/cp";
import { buildEmptyCpState } from "@/lib/cp";
import type { GachaDrawResult } from "@/lib/gacha";
import { buildDevCollectionUserKey, buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { encodeDevDisplayNameHeader, isAuthDevEnabled, isDevCollectionUserKey, readDevSession } from "@/lib/auth-dev";
import { getDevCpBalance } from "@/lib/cp-dev-balance";
import { getGachaDayJst } from "@/lib/gacha-daily-limit";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export const CP_UPDATED_EVENT = "chuchoter-cp-updated";

export function dispatchCpUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CP_UPDATED_EVENT));
}

export async function buildCpRequestHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const devSession = readDevSession();
  if (devSession?.email) {
    headers["X-Dev-User-Key"] = buildDevCollectionUserKey(devSession.email);
    if (devSession.displayName?.trim()) {
      headers["X-Dev-Display-Name"] = encodeDevDisplayNameHeader(devSession.displayName);
    }
    return headers;
  }

  if (isUserAuthEnabled()) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      /* ignore */
    }
  }

  return headers;
}

export async function fetchCpState(): Promise<CpState | null> {
  const userKey = await resolveClientCpUserKey();
  if (isAuthDevEnabled() && isDevCollectionUserKey(userKey) && userKey) {
    return {
      ...buildEmptyCpState(getGachaDayJst(), true),
      balance: getDevCpBalance(userKey),
    };
  }

  try {
    const response = await fetch("/api/user/cp", {
      headers: await buildCpRequestHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401) return null;
    if (!response.ok) {
      if (isAuthDevEnabled() && isDevCollectionUserKey(userKey) && userKey) {
        return {
          ...buildEmptyCpState(getGachaDayJst(), true),
          balance: getDevCpBalance(userKey),
        };
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "CP 情報の取得に失敗しました");
    }

    return (await response.json()) as CpState;
  } catch (error) {
    if (isAuthDevEnabled() && isDevCollectionUserKey(userKey) && userKey) {
      return {
        ...buildEmptyCpState(getGachaDayJst(), true),
        balance: getDevCpBalance(userKey),
      };
    }
    if (error instanceof Error && /CP 情報の取得に失敗/.test(error.message)) {
      throw error;
    }
    return buildEmptyCpState(getGachaDayJst(), false);
  }
}

export async function completeDailyTaskFromClient(taskId: DailyTaskId): Promise<CpState | null> {
  const response = await fetch("/api/user/cp/tasks", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({ taskId }),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "デイリータスクの完了に失敗しました");
  }

  const state = (await response.json()) as CpState;
  dispatchCpUpdated();
  return state;
}

export async function drawGacha(options: {
  payment: "free" | "cp";
  count?: 1 | 10;
}): Promise<{
  draws: GachaDrawResult[];
  balance: number;
  spent: number;
  payment: "free" | "cp";
  freeDrawAvailable: boolean;
}> {
  const count = options.count ?? 1;
  const response = await fetch("/api/gacha/draw", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({ payment: options.payment, count }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "ガチャ抽選に失敗しました");
  }

  const body = (await response.json()) as {
    draws: GachaDrawResult[];
    balance: number;
    spent: number;
    payment: "free" | "cp";
    freeDrawAvailable: boolean;
  };
  dispatchCpUpdated();
  return body;
}

/** @deprecated use drawGacha({ payment: "cp", count }) */
export async function drawGachaWithCp(count: 1 | 10): Promise<{
  draws: GachaDrawResult[];
  balance: number;
  spent: number;
}> {
  const result = await drawGacha({ payment: "cp", count });
  return { draws: result.draws, balance: result.balance, spent: result.spent };
}

export async function resolveClientCpUserKey(): Promise<string | null> {
  const devSession = readDevSession();
  if (devSession?.email) {
    return buildDevCollectionUserKey(devSession.email);
  }

  if (!isUserAuthEnabled()) return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ? buildAuthCollectionUserKey(user.id) : null;
  } catch {
    return null;
  }
}
