# CHUCHOTER 認証メールテンプレート

Supabase Dashboard → **Authentication** → **Emails** → 各テンプレートの **Body** に、対応する HTML を貼り付けてください。

## 設定の前提

1. **URL Configuration**
   - Site URL: `https://chuchoter-official.com`
   - Redirect URLs: `https://chuchoter-official.com/auth/callback`
2. **Confirm email** を ON（新規登録の確認メール）
3. 本番では **SMTP Settings**（Resend 等）を設定

## テンプレート一覧

| ファイル | Supabase の項目 | 件名（Subject）の例 |
|----------|-----------------|---------------------|
| `confirm-signup.html` | Confirm signup | `【CHUCHOTER】メールアドレスの確認` |
| `reset-password.html` | Reset password | `【CHUCHOTER】パスワード再設定` |
| `magic-link.html` | Magic Link | `【CHUCHOTER】ログインリンク` |

## 使い方

1. 各 `.html` を開き、中身をすべてコピー
2. Supabase の該当テンプレート **Body** に貼り付け
3. **Subject** に上表の件名を設定
4. **Save** 後、テスト登録で表示を確認

リンクをクリックすると `/auth/callback` 経由で **ログイン済みの状態** になり、プロフィールへ移動します。
