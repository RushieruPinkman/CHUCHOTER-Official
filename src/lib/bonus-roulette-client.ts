import type { BonusType } from "@/lib/bonus-period";
import {
  collectDevBonusRoulette,
  getDevBonusRouletteState,
  spinDevBonusRoulette,
} from "@/lib/bonus-roulette-dev-store";
import { dispatchBonusUpdated } from "@/lib/bonus-roulette-shared";
import type { BonusRouletteState } from "@/lib/bonus-roulette-store";
import { isAuthDevEnabled, isDevCollectionUserKey } from "@/lib/auth-dev";
import { buildCpRequestHeaders, dispatchCpUpdated, resolveClientCpUserKey } from "@/lib/cp-client";

export interface BonusClientOptions {
  /** /bonus/dev など開発試験ページでは常にローカル保存を使う */
  forceDev?: boolean;
}

async function resolveDevUserKey(): Promise<string | null> {
  if (!isAuthDevEnabled()) return null;
  return resolveClientCpUserKey();
}

const DISABLED_REMOTE_STATE: BonusRouletteState = { enabled: false, entries: [] };

const REMOTE_BONUS_TIMEOUT_MS = 4000;

async function fetchRemoteBonusState(): Promise<BonusRouletteState | null | "unauthorized"> {
  try {
    const response = await fetch("/api/user/bonus", {
      headers: await buildCpRequestHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REMOTE_BONUS_TIMEOUT_MS),
    });

    if (response.status === 401) return "unauthorized";
    if (!response.ok) {
      if (response.status >= 500) {
        return DISABLED_REMOTE_STATE;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "ボーナス情報の取得に失敗しました");
    }

    return (await response.json()) as BonusRouletteState;
  } catch (error) {
    if (error instanceof Error && /ボーナス情報の取得に失敗/.test(error.message)) {
      throw error;
    }
    return DISABLED_REMOTE_STATE;
  }
}

function prefersLocalBonusStore(devUserKey: string | null, forceDev = false): devUserKey is string {
  if (!devUserKey || !isAuthDevEnabled()) return false;
  if (forceDev) return true;
  return isDevCollectionUserKey(devUserKey);
}

function shouldUseDevBonusStore(
  remote: BonusRouletteState | null | "unauthorized",
  devUserKey: string | null,
  forceDev = false
): devUserKey is string {
  if (!prefersLocalBonusStore(devUserKey, forceDev)) return false;
  if (forceDev || isDevCollectionUserKey(devUserKey)) return true;
  if (remote === "unauthorized") return true;
  if (!remote) return true;
  return !remote.enabled;
}

export async function fetchBonusRouletteState(
  options: BonusClientOptions = {}
): Promise<BonusRouletteState | null> {
  const devUserKey = await resolveDevUserKey();
  if (prefersLocalBonusStore(devUserKey, options.forceDev)) {
    return getDevBonusRouletteState(devUserKey);
  }

  const remote = await fetchRemoteBonusState();

  if (shouldUseDevBonusStore(remote, devUserKey, options.forceDev)) {
    return getDevBonusRouletteState(devUserKey);
  }

  if (remote === "unauthorized") return null;
  return remote;
}

export async function spinBonusRoulette(
  type: BonusType,
  options: BonusClientOptions = {}
): Promise<{
  entry: BonusRouletteState["entries"][number];
  alreadySpun: boolean;
}> {
  const devUserKey = await resolveDevUserKey();
  if (prefersLocalBonusStore(devUserKey, options.forceDev)) {
    const result = spinDevBonusRoulette(devUserKey, type);
    dispatchBonusUpdated();
    return result;
  }

  const remote = await fetchRemoteBonusState();

  if (remote === "unauthorized" && !devUserKey) {
    throw new Error("ログインが必要です。");
  }

  if (shouldUseDevBonusStore(remote, devUserKey, options.forceDev)) {
    const result = spinDevBonusRoulette(devUserKey, type);
    dispatchBonusUpdated();
    return result;
  }

  const response = await fetch("/api/user/bonus/spin", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({ type }),
  });

  if (response.status === 401) {
    throw new Error("ログインが必要です。");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "ルーレットの抽選に失敗しました");
  }

  const result = (await response.json()) as {
    entry: BonusRouletteState["entries"][number];
    alreadySpun: boolean;
  };
  dispatchBonusUpdated();
  return result;
}

export async function collectBonusRoulette(
  type: BonusType,
  options: BonusClientOptions = {}
): Promise<{
  entry: BonusRouletteState["entries"][number];
  balance: number;
}> {
  const devUserKey = await resolveDevUserKey();
  if (prefersLocalBonusStore(devUserKey, options.forceDev)) {
    const result = collectDevBonusRoulette(devUserKey, type);
    dispatchCpUpdated();
    dispatchBonusUpdated();
    return result;
  }

  const remote = await fetchRemoteBonusState();

  if (remote === "unauthorized" && !devUserKey) {
    throw new Error("ログインが必要です。");
  }

  if (shouldUseDevBonusStore(remote, devUserKey, options.forceDev)) {
    const result = collectDevBonusRoulette(devUserKey, type);
    dispatchCpUpdated();
    dispatchBonusUpdated();
    return result;
  }

  const response = await fetch("/api/user/bonus/collect", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({ type }),
  });

  if (response.status === 401) {
    throw new Error("ログインが必要です。");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "ボーナスの受け取りに失敗しました");
  }

  const body = (await response.json()) as {
    entry: BonusRouletteState["entries"][number];
    balance: number;
  };
  dispatchCpUpdated();
  dispatchBonusUpdated();
  return body;
}
