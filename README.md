# CLUB CHUCHOTER Official Site

高級隠れ家クラブ「CLUB CHUCHOTER」の公式ウェブサイトです。

## 技術スタック

- **Next.js 15** (App Router)
- **Tailwind CSS 4**
- **Supabase** — 本番のデータ保存（無料プラン）
- **Vercel** — ホスティング（無料 Hobby プラン）

## セットアップ

```bash
npm install
cp .env.example .env.local   # 必要に応じて編集
npm run dev
```

http://localhost:3000 でサイトを確認できます。

## 管理画面

`/admin` に **URL とパスワード** がわかれば誰でも更新できます（ロボットは `noindex`）。

- ローカル: 初期パスワード `chuchoter-admin`（`data/settings.json`）
- 本番: 環境変数 `ADMIN_PASSWORD` を必ず設定

---

## 完全無料・広告なしで公開する（推奨構成）

| サービス | 役割 | 費用 |
|---------|------|------|
| [Vercel](https://vercel.com) | サイト配信 | 無料 |
| [Supabase](https://supabase.com) | データ・画像保存 | 無料 |
| [GitHub](https://github.com) | ソースコード管理 | 無料 |

どちらも **広告なし**・クレジットカード不要（無料枠内）で始められます。

### 1. Supabase を用意（5分）

1. [supabase.com](https://supabase.com) でアカウント作成 → **New project**（Free）
2. 左メニュー **SQL Editor** → `scripts/supabase-setup.sql` の内容を貼り付けて **Run**
3. **Project Settings → API** から以下を控える:
   - Project URL → `SUPABASE_URL`
   - `service_role` key（secret）→ `SUPABASE_SERVICE_ROLE_KEY`  
     ※ 絶対に公開しない。Vercel の環境変数にだけ設定

初回アクセス時、リポジトリ内の `data/*.json` が自動で Supabase にコピーされます。

### 2. GitHub にコードを push

Git がない場合は [GitHub Desktop](https://desktop.github.com/) が便利です。

### 3. Vercel にデプロイ

1. [vercel.com](https://vercel.com) → GitHub 連携 → リポジトリを Import
2. **Environment Variables** に設定:

| 名前 | 値 |
|------|-----|
| `NEXT_PUBLIC_SITE_URL` | `https://あなたのプロジェクト.vercel.app` |
| `ADMIN_PASSWORD` | 共有する管理用パスワード |
| `SUPABASE_URL` | Supabase の Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service_role key |

3. **Deploy**

### 4. 運用

- 公開 URL の `/admin` を開き、パスワードを入力して更新
- お知らせ・住民・予定表・運行状況・画像アップロードが **その場で本番に反映**
- Git push はサイト改修（デザイン変更など）のときだけで OK

---

## ページ構成

| パス | 内容 |
|------|------|
| `/` | エントランス |
| `/system` | ご案内 |
| `/casts` | 住人紹介 |
| `/schedule` | 予定表 |
| `/media` | ラウンジ |
| `/admin` | 管理画面 |

## データ

| 保存先（本番） | 内容 |
|----------------|------|
| Supabase `site_data` テーブル | JSON データ |
| Supabase `cast-images` バケット | アップロード画像 |
| `data/*.json`（リポジトリ） | 初回シード・ローカル開発用 |

## ビルド

```bash
npm run build
npm start
```

```bash
npm run dev:clean    # 開発時キャッシュ問題
npm run build:clean  # ビルド前に .next 削除
```
