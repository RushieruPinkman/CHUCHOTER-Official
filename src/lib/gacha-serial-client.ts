import type { CollectionExchangeRecord } from "@/lib/gacha-collection-exchange";
import { updateCollectionExchangeRecordSerial } from "@/lib/gacha-collection-exchange";
import type { GachaDrawResult } from "@/lib/gacha";
import { getPrizeByRarity } from "@/lib/gacha";
import {
  shouldTrackGachaPrizeSerial,
  withGachaSerialNumber,
  type GachaSerialPublicRecord,
  type GachaSerialStatus,
} from "@/lib/gacha-serial";
import { ensureUserApiSession } from "@/lib/gacha-collection-client";

export const GACHA_SERIAL_STATUS_UPDATED_EVENT = "chuchoter-gacha-serial-status-updated";

export interface IssueGachaSerialRequest {
  rarity: number;
  source: "draw" | "exchange";
  wonAt: string;
  prizeTitle: string;
  prizeSubtitle?: string | null;
  castName?: string | null;
}

function dispatchSerialStatusUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GACHA_SERIAL_STATUS_UPDATED_EVENT));
}

export async function issueGachaSerialFromApi(
  input: IssueGachaSerialRequest
): Promise<GachaSerialPublicRecord> {
  const response = await fetch("/api/gacha/serials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "シリアルNo.の発行に失敗しました。");
  }

  const body = (await response.json()) as { record: GachaSerialPublicRecord };
  dispatchSerialStatusUpdated();
  return body.record;
}

export function serialRecordToDrawResult(record: GachaSerialPublicRecord): GachaDrawResult {
  const basePrize = getPrizeByRarity(record.rarity);

  return {
    rarity: record.rarity,
    prize: {
      ...basePrize,
      title: record.prizeTitle || basePrize.title,
      subtitle: record.prizeSubtitle || basePrize.subtitle,
    },
    wonAt: record.wonAt,
    serialNumber: record.serial,
    serialStatus: record.status,
  };
}

export async function fetchPendingGachaPrizes(): Promise<GachaDrawResult[]> {
  const response = await fetch("/api/gacha/serials?pending=1", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) return [];
  if (!response.ok) return [];

  const body = (await response.json()) as { records?: GachaSerialPublicRecord[] };
  return (body.records ?? []).map(serialRecordToDrawResult);
}

export async function fetchGachaSerialStatuses(
  serials: string[]
): Promise<Record<string, GachaSerialStatus>> {
  const unique = [...new Set(serials.map((serial) => serial.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  const params = new URLSearchParams({ serials: unique.join(",") });
  const response = await fetch(`/api/gacha/serials?${params.toString()}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {};
  }

  const body = (await response.json()) as { records?: GachaSerialPublicRecord[] };
  const map: Record<string, GachaSerialStatus> = {};
  for (const record of body.records ?? []) {
    map[record.serial] = record.status;
  }
  return map;
}

export async function attachSerialToExchangeRecord(
  userKey: string,
  record: CollectionExchangeRecord,
  options: { devMode?: boolean } = {}
): Promise<CollectionExchangeRecord> {
  if (!shouldTrackGachaPrizeSerial(record.rarity)) {
    return record;
  }

  if (record.serialNumber?.trim()) {
    return record;
  }

  if (options.devMode) {
    const draw: GachaDrawResult = withGachaSerialNumber({
      rarity: record.rarity,
      prize: {
        ...getPrizeByRarity(record.rarity),
        title: record.prizeTitle,
        subtitle: record.prizeSubtitle,
      },
      wonAt: record.exchangedAt,
    });
    const serial = draw.serialNumber?.trim();
    if (!serial) return record;

    return (
      updateCollectionExchangeRecordSerial(userKey, record.id, serial) ?? {
        ...record,
        serialNumber: serial,
        serialStatus: "issued",
      }
    );
  }

  const hasSession = await ensureUserApiSession();
  if (!hasSession) {
    throw new Error("ログインセッションの確認に失敗しました。再ログインしてからお試しください。");
  }

  const serialRecord = await issueGachaSerialFromApi({
    rarity: record.rarity,
    source: "exchange",
    wonAt: record.exchangedAt,
    prizeTitle: record.prizeTitle,
    prizeSubtitle: record.prizeSubtitle,
  });

  return (
    updateCollectionExchangeRecordSerial(userKey, record.id, serialRecord.serial) ?? {
      ...record,
      serialNumber: serialRecord.serial,
      serialStatus: serialRecord.status,
    }
  );
}

export async function attachSerialToDrawResult(
  draw: GachaDrawResult,
  options: { devMode?: boolean } = {}
): Promise<GachaDrawResult> {
  if (!shouldTrackGachaPrizeSerial(draw.rarity)) {
    return draw;
  }

  if (options.devMode) {
    return withGachaSerialNumber(draw);
  }

  const record = await issueGachaSerialFromApi({
    rarity: draw.rarity,
    source: "draw",
    wonAt: draw.wonAt,
    prizeTitle: draw.prize.title,
    prizeSubtitle: draw.prize.subtitle,
    castName: draw.cast?.name ?? null,
  });

  return {
    ...draw,
    serialNumber: record.serial,
    serialStatus: record.status,
  };
}

export function applySerialStatusToDraw(
  draw: GachaDrawResult,
  statusMap: Record<string, GachaSerialStatus>
): GachaDrawResult {
  const serial = draw.serialNumber?.trim();
  if (!serial || !statusMap[serial]) return draw;
  return { ...draw, serialStatus: statusMap[serial] };
}
