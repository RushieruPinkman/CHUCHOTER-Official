/**
 * Supabase の DB テーブルと Storage をローカルにバックアップします。
 *
 * 使い方:
 *   node scripts/backup-supabase.mjs
 *   node scripts/backup-supabase.mjs --skip-storage
 *
 * 必要: .env.local に SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE_SIZE = 1000;

const TABLES = [
  "site_data",
  "user_cp_balances",
  "user_cp_ledger",
  "user_daily_task_completions",
  "user_daily_free_gacha",
  "user_bonus_roulette_claims",
  "user_gacha_collections",
  "user_gacha_draw_history",
  "user_gacha_exchange_history",
  "user_gacha_collection_notices",
  "gacha_serials",
  "dm_threads",
  "dm_messages",
  "user_push_subscriptions",
  "user_push_notification_log",
];

const STORAGE_BUCKETS = ["cast-images", "cast-voices", "dm-attachments"];

async function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local が無くても環境変数直指定なら OK
  }
}

function timestampLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function fetchAllRows(supabase, table) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (/does not exist|42P01|Could not find the table/i.test(error.message)) {
        return { rows: [], skipped: true, reason: "table not found" };
      }
      const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
      throw new Error(`${table}: ${error.message}${cause}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, skipped: false };
}

async function listStorageObjects(supabase, bucket) {
  const objects = [];

  async function walk(prefix = "") {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        if (/Bucket not found/i.test(error.message)) {
          return { skipped: true, reason: "bucket not found" };
        }
        throw new Error(`${bucket}/${prefix}: ${error.message}`);
      }

      const entries = data ?? [];
      for (const entry of entries) {
        const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id == null) {
          await walk(objectPath);
        } else {
          objects.push({ path: objectPath, size: entry.metadata?.size ?? null });
        }
      }

      if (entries.length < 100) break;
      offset += 100;
    }
  }

  const walkResult = await walk("");
  if (walkResult?.skipped) return walkResult;
  return { objects, skipped: false };
}

async function downloadStorageBucket(supabase, bucket, destDir) {
  const listing = await listStorageObjects(supabase, bucket);
  if (listing.skipped) {
    return { bucket, skipped: true, reason: listing.reason, files: 0, bytes: 0 };
  }

  let files = 0;
  let bytes = 0;

  for (const object of listing.objects) {
    const { data, error } = await supabase.storage.from(bucket).download(object.path);
    if (error) {
      console.warn(`  [warn] download failed: ${bucket}/${object.path} — ${error.message}`);
      continue;
    }

    const outPath = path.join(destDir, bucket, object.path);
    await mkdir(path.dirname(outPath), { recursive: true });
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(outPath, buffer);
    files += 1;
    bytes += buffer.length;
  }

  return { bucket, skipped: false, files, bytes };
}

async function main() {
  const skipStorage = process.argv.includes("--skip-storage");

  await loadEnvLocal();

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。");
    process.exit(1);
  }

  try {
    const host = new URL(url).hostname;
    if (/x{4,}|example|xxxxxxxx|your-/i.test(host) || key.length < 80 || /your-|example|xxxxxxxx/i.test(key)) {
      console.error(
        ".env.local の Supabase 設定がプレースホルダです。Dashboard の本物の URL / service_role キーを設定してから再実行してください。"
      );
      process.exit(1);
    }
  } catch {
    console.error("SUPABASE_URL の形式が不正です。");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(60_000),
        }),
    },
  });

  const label = timestampLabel();
  const backupDir = path.join(ROOT, "backups", label);
  const dbDir = path.join(backupDir, "db");
  const storageDir = path.join(backupDir, "storage");
  await mkdir(dbDir, { recursive: true });
  if (!skipStorage) await mkdir(storageDir, { recursive: true });

  console.log(`Backup destination: backups/${label}/`);

  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl: url,
    tables: {},
    storage: {},
  };

  console.log("\n[DB]");
  for (const table of TABLES) {
    process.stdout.write(`  ${table} ... `);
    const result = await fetchAllRows(supabase, table);
    if (result.skipped) {
      console.log("skipped (not found)");
      manifest.tables[table] = { rows: 0, skipped: true, reason: result.reason };
      continue;
    }

    const outFile = path.join(dbDir, `${table}.json`);
    await writeFile(outFile, JSON.stringify(result.rows, null, 2), "utf8");
    console.log(`${result.rows.length} rows`);
    manifest.tables[table] = { rows: result.rows.length, skipped: false };
  }

  if (!skipStorage) {
    console.log("\n[Storage]");
    for (const bucket of STORAGE_BUCKETS) {
      process.stdout.write(`  ${bucket} ... `);
      const result = await downloadStorageBucket(supabase, bucket, storageDir);
      if (result.skipped) {
        console.log(`skipped (${result.reason})`);
        manifest.storage[bucket] = result;
        continue;
      }
      console.log(`${result.files} files (${result.bytes} bytes)`);
      manifest.storage[bucket] = result;
    }
  } else {
    manifest.storage = { skipped: true };
  }

  await writeFile(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("\nDone.");
  console.log(`  DB:      backups/${label}/db/`);
  if (!skipStorage) console.log(`  Storage: backups/${label}/storage/`);
  console.log(`  Manifest: backups/${label}/manifest.json`);
  console.log("\nNote: Supabase Auth の会員アカウントは Dashboard → Authentication から別途エクスポートしてください。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
