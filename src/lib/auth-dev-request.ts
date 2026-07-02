import type { NextRequest } from "next/server";
import { buildDevCollectionUserKey } from "@/lib/gacha-collection";
import { decodeDevDisplayNameHeader, isAuthDevEnabled } from "@/lib/auth-dev";

const DEV_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** API リクエストの X-Dev-User-Key から開発用 userKey を解決（next dev のみ） */
export function resolveDevRequestUserKey(request: NextRequest): string | null {
  if (!isAuthDevEnabled()) return null;

  const header = request.headers.get("x-dev-user-key")?.trim();
  if (!header?.toLowerCase().startsWith("dev:")) return null;

  const email = header.slice(4).trim();
  if (!email || !DEV_EMAIL_PATTERN.test(email)) return null;

  return buildDevCollectionUserKey(email);
}

export function resolveDevRequestDisplayName(request: NextRequest, email: string): string {
  const fromHeader = request.headers.get("x-dev-display-name")?.trim();
  if (fromHeader) return decodeDevDisplayNameHeader(fromHeader);

  const local = email.split("@")[0]?.trim();
  return local || "Dev User";
}
