type GachaSerialRarity = 1 | 2 | 3 | 4 | 5 | 6;

export type GachaSerialStatus = "issued" | "used";

export interface GachaSerialDraw {
  rarity: GachaSerialRarity;
  wonAt: string;
  serialNumber?: string;
  serialStatus?: GachaSerialStatus;
}

export interface GachaSerialPublicRecord {
  serial: string;
  status: GachaSerialStatus;
  rarity: GachaSerialRarity;
  source: "draw" | "exchange";
  wonAt: string;
  prizeTitle: string;
  prizeSubtitle: string | null;
  castName: string | null;
  usedAt: string | null;
}

const SERIAL_PREFIX = "CCT";
const SERIAL_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const SERIAL_LOWER = "abcdefghijkmnopqrstuvwxyz";
const SERIAL_DIGIT = "23456789";
const SERIAL_SYMBOL = "!@#$%&*+-=?";
const SERIAL_ALPHABET = `${SERIAL_UPPER}${SERIAL_LOWER}${SERIAL_DIGIT}${SERIAL_SYMBOL}`;
const SERIAL_BODY_LENGTH = 12;

function pickRandomChar(pool: string): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(1);
    crypto.getRandomValues(bytes);
    return pool[bytes[0]! % pool.length]!;
  }
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function randomSerialBody(length: number): string {
  let body = "";
  for (let i = 0; i < length; i++) {
    body += pickRandomChar(SERIAL_ALPHABET);
  }
  return body;
}

function buildMixedSerialBody(): string {
  const required = [
    pickRandomChar(SERIAL_UPPER),
    pickRandomChar(SERIAL_LOWER),
    pickRandomChar(SERIAL_DIGIT),
    pickRandomChar(SERIAL_SYMBOL),
  ];

  const rest = randomSerialBody(Math.max(0, SERIAL_BODY_LENGTH - required.length)).split("");
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = pickRandomChar("0123456789").charCodeAt(0) % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join("");
}

/** シリアルは無期限で保持（自動削除なし） */

/** ★4〜★6の景品受け取り追跡用シリアルをサーバーに発行 */
export function shouldTrackGachaPrizeSerial(rarity: GachaSerialRarity): boolean {
  return rarity >= 4 && rarity <= 6;
}

/** ★5以上の当選時にユーザーへシリアルNo.を表示 */
export function shouldIssueGachaSerialNumber(rarity: GachaSerialRarity): boolean {
  return rarity >= 5;
}

/** 景品受け取りAPIで使うシリアル（★4は非表示だが内部で保持） */
export function getGachaClaimSerial(result: GachaSerialDraw): string | null {
  const serial = result.serialNumber?.trim();
  if (!serial || !shouldTrackGachaPrizeSerial(result.rarity)) return null;
  return serial;
}

export function generateGachaSerialNumber(): string {
  return `${SERIAL_PREFIX}-${buildMixedSerialBody()}`;
}

export function isValidGachaSerialNumber(serial: string): boolean {
  const normalized = serial.trim();
  if (!normalized.startsWith(`${SERIAL_PREFIX}-`)) return false;

  const body = normalized.slice(SERIAL_PREFIX.length + 1);
  if (body.length !== SERIAL_BODY_LENGTH) return false;

  return [...body].every((char) => SERIAL_ALPHABET.includes(char));
}

export function normalizeGachaSerialNumber(serial: string): string {
  return serial.trim();
}

export function withGachaSerialNumber<T extends GachaSerialDraw>(result: T): T {
  if (result.serialNumber || !shouldTrackGachaPrizeSerial(result.rarity)) {
    return result;
  }

  return {
    ...result,
    serialNumber: generateGachaSerialNumber(),
    serialStatus: "issued",
  };
}

export function getGachaReportSerial(result: GachaSerialDraw): string | null {
  const serial = result.serialNumber?.trim();
  if (!serial || !shouldIssueGachaSerialNumber(result.rarity)) return null;
  return serial;
}

export function formatGachaSerialLabel(serialNumber: string): string {
  return `シリアルNo.: ${serialNumber}`;
}

export function getGachaSerialStatusLabel(status: GachaSerialStatus): string {
  return status === "used" ? "使用済み" : "未使用";
}

export function isGachaSerialUsed(result: GachaSerialDraw): boolean {
  return result.serialStatus === "used";
}

export function canClaimGachaPrize(result: GachaSerialDraw): boolean {
  return Boolean(getGachaClaimSerial(result)) && !isGachaSerialUsed(result);
}
