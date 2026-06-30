import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Cast } from "@/types";

export const CAST_IMAGES_BUCKET = "cast-images";
export const CAST_VOICES_BUCKET = "cast-voices";

const CAST_ASSET_FIELDS = ["image", "voiceUrl", "gachaSignCardUrl", "gachaVoiceUrl"] as const;

type CastAssetField = (typeof CAST_ASSET_FIELDS)[number];

export function collectCastAssetUrls(cast: Pick<Cast, CastAssetField>): string[] {
  return CAST_ASSET_FIELDS.map((field) => cast[field]?.trim()).filter((url): url is string => Boolean(url));
}

function parseSupabasePublicObjectUrl(
  url: string
): { bucket: string; objectPath: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1]!, objectPath: decodeURIComponent(match[2]!) };
  } catch {
    return null;
  }
}

function parseLocalCastAssetPath(url: string): string | null {
  if (!url.startsWith("/")) return null;
  const relative = url.split("?")[0]!.replace(/^\//, "");
  if (relative.startsWith("images/casts/") || relative.startsWith("audio/casts/")) {
    return path.join(process.cwd(), "public", relative);
  }
  return null;
}

function isDefaultPlaceholder(url: string): boolean {
  return url.includes("placeholder");
}

export async function deleteCastAssetUrl(url: string | undefined): Promise<boolean> {
  const trimmed = url?.trim();
  if (!trimmed || isDefaultPlaceholder(trimmed)) return false;

  const supabase = getSupabaseAdmin();
  const remote = parseSupabasePublicObjectUrl(trimmed);

  if (remote && (remote.bucket === CAST_IMAGES_BUCKET || remote.bucket === CAST_VOICES_BUCKET)) {
    if (!supabase) return false;
    const { error } = await supabase.storage.from(remote.bucket).remove([remote.objectPath]);
    if (error) {
      console.error("[cast-storage] remote delete failed:", error.message, trimmed);
      return false;
    }
    return true;
  }

  const localPath = parseLocalCastAssetPath(trimmed);
  if (localPath) {
    try {
      await fs.unlink(localPath);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function cleanupReplacedCastAssets(
  previous: Pick<Cast, CastAssetField>,
  next: Pick<Cast, CastAssetField>,
  remainingCasts: Pick<Cast, CastAssetField>[]
): Promise<number> {
  let deleted = 0;

  for (const field of CAST_ASSET_FIELDS) {
    const oldUrl = previous[field]?.trim();
    const newUrl = next[field]?.trim();
    if (!oldUrl || oldUrl === newUrl) continue;

    const stillReferenced = remainingCasts.some((cast) => cast[field]?.trim() === oldUrl);
    if (stillReferenced) continue;

    if (await deleteCastAssetUrl(oldUrl)) {
      deleted += 1;
    }
  }

  return deleted;
}

export async function cleanupDeletedCastAssets(
  removed: Pick<Cast, CastAssetField>,
  remainingCasts: Pick<Cast, CastAssetField>[]
): Promise<number> {
  let deleted = 0;

  for (const url of collectCastAssetUrls(removed)) {
    const stillReferenced = remainingCasts.some((cast) => collectCastAssetUrls(cast).includes(url));
    if (stillReferenced) continue;
    if (await deleteCastAssetUrl(url)) {
      deleted += 1;
    }
  }

  return deleted;
}
