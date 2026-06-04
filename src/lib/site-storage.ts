import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { unstable_cache } from "next/cache";
import { getMissingSupabaseEnvVars, getSupabaseAdmin, isRemoteStorageEnabled } from "@/lib/supabase-admin";

export const SITE_DATA_CACHE_TAG = "site-data";
const SITE_DATA_REVALIDATE_SECONDS = 300;

const DATA_DIR = path.join(process.cwd(), "data");

function fileKey(filename: string): string {
  return filename.replace(/\.json$/, "");
}

export function getStorageStatus() {
  const missing = getMissingSupabaseEnvVars();
  return {
    remoteStorage: isRemoteStorageEnabled(),
    isVercel: process.env.VERCEL === "1",
    missingEnv: missing,
    writable: isRemoteStorageEnabled() || process.env.VERCEL !== "1",
  };
}

function assertWritableStorage(): void {
  if (process.env.VERCEL === "1" && !isRemoteStorageEnabled()) {
    const missing = getMissingSupabaseEnvVars();
    throw new Error(
      missing.length > 0
        ? `Supabase が未設定です（${missing.join(" / ")}）。Vercel の環境変数を設定して再デプロイしてください。`
        : "本番環境では Supabase ストレージが必要です。"
    );
  }
}

async function readLocalJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeLocalJsonFile<T>(filename: string, data: T): Promise<void> {
  assertWritableStorage();
  await fs.writeFile(
    path.join(DATA_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

async function readJsonFileUncached<T>(filename: string, fallback: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return readLocalJsonFile(filename, fallback);
  }

  const key = fileKey(filename);
  const { data, error } = await supabase
    .from("site_data")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read ${key}: ${error.message}`);
  }

  if (data?.value != null) {
    return data.value as T;
  }

  const local = await readLocalJsonFile(filename, fallback);
  await writeJsonFile(filename, local);
  return local;
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const key = fileKey(filename);
  const cached = unstable_cache(
    () => readJsonFileUncached(filename, fallback),
    ["site-json", key],
    {
      revalidate: SITE_DATA_REVALIDATE_SECONDS,
      tags: [SITE_DATA_CACHE_TAG, `site-json:${key}`],
    }
  );
  return cached();
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    await writeLocalJsonFile(filename, data);
    return;
  }

  const key = fileKey(filename);
  const { error } = await supabase.from("site_data").upsert(
    {
      key,
      value: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`Failed to write ${key}: ${error.message}`);
  }
}
