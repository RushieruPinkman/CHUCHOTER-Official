/**
 * CHUCHOTER サイト撤退用スクリプト
 *
 * 実行: npm run decommission
 *
 * できること（自動）:
 * - ローカル data/ と SQL スキーマのスナップショット
 * - Discord Webhook 設定のクリア（ローカル）
 * - .env.local の退避（リネーム）
 * - 手動ステップ一覧の生成
 *
 * できないこと（ダッシュボード操作が必要）:
 * - 本番 Supabase のバックアップ（.env.local に本物の鍵が必要）
 * - DNS 切断 / Supabase プロジェクト削除 / Discord Webhook 削除
 */

import { cp, mkdir, writeFile, readFile, rename, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function timestampLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  const env = {};
  if (!(await exists(envPath))) return env;
  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

function isPlaceholderSupabase(env) {
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return true;
  try {
    const host = new URL(url).hostname;
    if (/x{4,}|example|xxxxxxxx|your-/i.test(host)) return true;
  } catch {
    return true;
  }
  if (key.length < 80 || /your-|example|xxxxxxxx/i.test(key)) return true;
  return false;
}

function lookupDns(host) {
  try {
    const out = execSync(`nslookup ${host}`, { encoding: "utf8", timeout: 15000 });
    return out.slice(0, 2000);
  } catch (e) {
    return e.stdout?.slice(0, 2000) || e.message || "nslookup failed";
  }
}

async function main() {
  const label = timestampLabel();
  const outDir = path.join(ROOT, "backups", `decommission-${label}`);
  await mkdir(outDir, { recursive: true });

  const env = await loadEnvLocal();
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "https://chuchoter-official.com").trim();
  let siteHost = "chuchoter-official.com";
  try {
    siteHost = new URL(siteUrl).hostname;
  } catch {
    /* keep default */
  }

  const status = {
    createdAt: new Date().toISOString(),
    siteUrl,
    siteHost,
    steps: {},
  };

  // --- Step 1: local snapshot ---
  console.log("[1/5] Local data snapshot...");
  const localDataDir = path.join(outDir, "local-data");
  if (await exists(path.join(ROOT, "data"))) {
    await cp(path.join(ROOT, "data"), localDataDir, { recursive: true });
    status.steps.localDataSnapshot = { ok: true, path: "local-data/" };
    console.log("  copied data/ -> local-data/");
  } else {
    status.steps.localDataSnapshot = { ok: false, reason: "data/ not found" };
  }

  const sqlDir = path.join(outDir, "sql-schema");
  await mkdir(sqlDir, { recursive: true });
  const { readdir } = await import("fs/promises");
  for (const name of await readdir(path.join(ROOT, "scripts"))) {
    if (name.startsWith("supabase") && name.endsWith(".sql")) {
      await cp(path.join(ROOT, "scripts", name), path.join(sqlDir, name));
    }
  }
  status.steps.sqlSchemaSnapshot = { ok: true, path: "sql-schema/" };

  const placeholder = isPlaceholderSupabase(env);
  status.steps.remoteSupabaseBackup = {
    ok: false,
    skipped: placeholder,
    reason: placeholder
      ? ".env.local の SUPABASE_URL / SERVICE_ROLE_KEY がプレースホルダのため、本番DBへ接続できません。Dashboard から手動エクスポートするか、本物の鍵を .env.local に入れて npm run backup:supabase を実行してください。"
      : "run npm run backup:supabase separately",
  };
  if (placeholder) {
    console.log("  WARN: remote Supabase backup skipped (placeholder credentials)");
  }

  // --- Step 2: DNS check ---
  console.log("[2/5] DNS check...");
  const dnsOut = lookupDns(siteHost);
  await writeFile(path.join(outDir, "dns-nslookup.txt"), dnsOut, "utf8");
  status.steps.dns = {
    ok: false,
    manual: true,
    nslookupSaved: "dns-nslookup.txt",
    instructions: [
      `DNS管理画面で ${siteHost} の Vercel 向け A / CNAME レコードを削除する`,
      "必要なら closed.html を別ホスティングに置く",
      "ドメイン不要ならレジストラで更新停止/解約",
    ],
  };
  console.log(`  nslookup saved (${siteHost})`);

  // --- Step 3: clear local webhook ---
  console.log("[3/5] Clear local Discord webhook settings...");
  const dmSettingsPath = path.join(ROOT, "data", "dm-settings.json");
  if (await exists(dmSettingsPath)) {
    await writeFile(
      dmSettingsPath,
      `${JSON.stringify({ discordWebhookUrl: "" }, null, 2)}\n`,
      "utf8"
    );
    // refresh snapshot copy
    await cp(dmSettingsPath, path.join(localDataDir, "dm-settings.json"));
  }
  status.steps.webhooks = {
    ok: true,
    localCleared: true,
    manualDiscord: [
      "Discord サーバー設定 → 連携サービス → Incoming Webhook を削除",
      "環境変数 DISCORD_DM_WEBHOOK_URL があれば破棄（.env.local 退避で対応）",
    ],
  };
  console.log("  local dm-settings.json webhook cleared");

  // closed page copy into backup
  const closedSrc = path.join(ROOT, "public", "closed.html");
  if (await exists(closedSrc)) {
    await cp(closedSrc, path.join(outDir, "closed.html"));
  }

  // --- Step 4: Supabase delete (manual) ---
  console.log("[4/5] Supabase delete instructions...");
  status.steps.supabaseDelete = {
    ok: false,
    manual: true,
    instructions: [
      "先に Dashboard → Authentication → Users → Export で会員CSVを取得",
      "Table Editor から必要テーブルを CSV エクスポート（鍵が無い場合）",
      "Storage バケットのファイルをダウンロード",
      "バックアップ確認後: Project Settings → General → Delete project",
    ],
  };

  // --- Step 5: retire env ---
  console.log("[5/5] Retire local secrets...");
  const envPath = path.join(ROOT, ".env.local");
  if (await exists(envPath)) {
    const retiredName = `.env.local.retired-${label}`;
    const retiredPath = path.join(ROOT, retiredName);
    await cp(envPath, path.join(outDir, "env.local.retired.txt"));
    await rename(envPath, retiredPath);
    await writeFile(
      envPath,
      [
        "# CHUCHOTER decommissioned — secrets retired",
        `# Previous file moved to ${retiredName}`,
        `# Snapshot also in backups/decommission-${label}/env.local.retired.txt`,
        "NEXT_PUBLIC_SITE_URL=https://chuchoter-official.com",
        "",
      ].join("\n"),
      "utf8"
    );
    status.steps.secrets = {
      ok: true,
      retiredTo: retiredName,
      snapshotInBackup: "env.local.retired.txt",
      note: "本番鍵が別端末にある場合はそちらも破棄してください。GitHub リポジトリは Archive 推奨。",
    };
    console.log(`  .env.local -> ${retiredName}`);
  } else {
    status.steps.secrets = { ok: true, note: ".env.local was already absent" };
  }

  // Clear local admin password from working data (kept in snapshot)
  const settingsPath = path.join(ROOT, "data", "settings.json");
  if (await exists(settingsPath)) {
    await writeFile(
      settingsPath,
      `${JSON.stringify({ adminPassword: "" }, null, 2)}\n`,
      "utf8"
    );
  }

  const manualSteps = `# CHUCHOTER 撤退 — 手動で残っている作業

作成日時: ${status.createdAt}
スナップショット: backups/decommission-${label}/

## A. 本番データの退避（ローカル鍵が無効なため必須）

1. https://supabase.com/dashboard を開く
2. Authentication → Users → Export（会員CSV）
3. Table Editor で主要テーブルを CSV エクスポート
   - site_data, gacha_serials, dm_threads, dm_messages,
     user_gacha_collections, user_cp_balances など
4. Storage: cast-images / cast-voices / dm-attachments をダウンロード
5. 取得ファイルをこのフォルダの remote-manual/ に入れて保管

（本物の SUPABASE_URL と SERVICE_ROLE_KEY が分かれば、
 .env.local に書いて npm run backup:supabase でも可）

## B. DNS（${siteHost}）

1. ドメイン管理画面で Vercel 向け A / CNAME を削除
2. 任意: closed.html を別サーバーのドキュメントルートに配置
3. 不要ならドメイン更新を停止

現在の nslookup 結果は dns-nslookup.txt を参照。

## C. Discord

1. サーバー設定 → 連携サービス → Webhook を削除

## D. Supabase プロジェクト削除

上記 A のバックアップ確認後:
Project Settings → General → Delete project

## E. リポジトリ

GitHub で Archive（または削除）

## 完了後

この STATUS.json の steps.*.ok を自分で true に更新して記録してもよい。
`;

  await writeFile(path.join(outDir, "MANUAL_STEPS.txt"), manualSteps, "utf8");
  await writeFile(path.join(outDir, "STATUS.json"), JSON.stringify(status, null, 2), "utf8");
  await mkdir(path.join(outDir, "remote-manual"), { recursive: true });
  await writeFile(
    path.join(outDir, "remote-manual", "README.txt"),
    "ここに Dashboard から落とした CSV / Storage ファイルを入れてください。\n",
    "utf8"
  );

  console.log("\nDone.");
  console.log(`  Snapshot: backups/decommission-${label}/`);
  console.log("  Next: open MANUAL_STEPS.txt and finish Dashboard / DNS tasks.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
