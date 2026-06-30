import type { GachaDrawResult } from "@/lib/gacha";
import {
  shouldTrackGachaPrizeSerial,
  withGachaSerialNumber,
  type GachaSerialPublicRecord,
  type GachaSerialStatus,
} from "@/lib/gacha-serial";

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

export async function fetchGachaSerialStatuses(
  serials: string[]
): Promise<Record<string, GachaSerialStatus>> {
  const unique = [...new Set(serials.map((serial) => serial.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  const params = new URLSearchParams({ serials: unique.join(",") });
  const response = await fetch(`/api/gacha/serials?${params.toString()}`);

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
