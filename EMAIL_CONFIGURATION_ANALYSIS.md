# メール送信機能 原因分析と対策案

**調査日**: 2025-11-12
**状況**: 新規登録時・パスワードリセット時にメールが届かない

---

## 📋 現状分析

### 問題の症状
1. **新規登録時**: 保護者アカウント作成後、確認メールが届かない
2. **パスワードリセット**: リセットリンク送信後、メールが届かない

### 原因（結論）

**これは仕様です（意図的な設定）**

ローカル開発環境では実際のメール送信は行われず、Supabase Local Development環境で以下の設定が有効になっています：

1. **メール確認が無効化**:
   - `supabase/config.toml` Line 173: `enable_confirmations = false`
   - 新規ユーザーはメール確認なしで即座に利用可能

2. **保護者登録では自動確認**:
   - `app/api/auth/parent-register/route.ts` Line 70: `email_confirm: true`
   - Admin APIで作成時に自動的にメール確認済みとしてマーク

3. **SMTPサーバー未設定**:
   - `supabase/config.toml` Lines 184-190: SMTP設定がコメントアウト
   - 本番用メールサーバーは未設定

---

## 🔍 詳細分析

### 1. 新規登録（保護者）

**ファイル**: `app/api/auth/parent-register/route.ts` (Line 67-76)

```typescript
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: parent.email,
  password: parent.password,
  email_confirm: true, // ← メール確認を自動的に完了
  user_metadata: {
    role: "parent",
    full_name: parent.fullName,
    full_name_kana: parent.fullNameKana,
  },
})
```

**動作**:
- `email_confirm: true` により、メール確認ステップをスキップ
- ユーザーは即座にログイン可能
- **メールは送信されない**（設計通り）

**登録後の動作確認**:
- `app/page.tsx` Line 19-21: 登録完了後に `?registered=true` パラメータ付きでログイン画面にリダイレクト
- 「登録が完了しました。ログインしてください。」メッセージを表示
- ユーザーは即座にログイン可能

### 2. パスワードリセット

**ファイル**: `app/actions/auth.ts` (Line 345-362)

```typescript
export async function sendPasswordResetEmail(email: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get("origin") || "http://localhost:3000"

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: "パスワードリセットメールを送信しました。メールをご確認ください。",
  }
}
```

**動作**:
- `resetPasswordForEmail()` を呼び出すが、SMTPサーバーが未設定のため実際には送信されない
- ローカル環境では Inbucket（メールテストサーバー）にメールがキャプチャされる
- **実際のメールアドレスには届かない**

### 3. Supabase設定

**ファイル**: `supabase/config.toml`

#### メール確認の無効化 (Line 173)
```toml
[auth.email]
# If enabled, users need to confirm their email address before signing in.
enable_confirmations = false
```

#### SMTP設定（コメントアウト） (Lines 184-190)
```toml
# Use a production-ready SMTP server
# [auth.email.smtp]
# enabled = true
# host = "smtp.sendgrid.net"
# port = 587
# user = "apikey"
# pass = "env(SMTP_PASS)"
# admin_email = "admin@email.com"
# sender_name = "Admin"
```

#### Inbucket（メールテストサーバー） (Lines 88-95)
```toml
# Email testing server. Emails sent with the local dev setup are not actually sent - rather, they
# are monitored, and you can view the emails that would have been sent from the web interface.
[inbucket]
enabled = true
# Port to use for the email testing server web interface.
port = 54324
```

---

## ✅ これは正しい動作です

### ローカル開発環境の設計意図

1. **開発効率の向上**:
   - メール確認なしで即座にテスト可能
   - メールサーバー設定不要

2. **セキュリティ**:
   - 実際のメールアドレスにテストメールを送信しない
   - 誤って本番メールを送信するリスクを回避

3. **Inbucket による確認**:
   - 送信されるはずのメールは Inbucket でキャプチャされる
   - `http://localhost:54324` でメール内容を確認可能（ローカルSupabase起動時）

---

## 🚀 本番環境への対応策

本番環境でメール送信を有効にする場合は、以下の設定が必要です。

### 手順1: SMTP サーバーの準備

以下のいずれかのメールサービスを選択：

#### オプションA: SendGrid（推奨）
- 無料プラン: 100通/日
- 登録: https://sendgrid.com/
- API Key を取得

#### オプションB: Amazon SES
- AWS アカウント必要
- 低コストで大量送信可能

#### オプションC: Gmail SMTP
- 開発用途のみ推奨
- 1日の送信制限あり（500通）

### 手順2: Supabase Dashboard で設定

**本番環境の Supabase Project** で以下を設定：

1. **Authentication > Email Templates**
   - 確認メールのテンプレートをカスタマイズ
   - リセットメールのテンプレートをカスタマイズ

2. **Settings > Auth > Email Auth**
   - `Enable email confirmations`: ON
   - `Enable email change confirmations`: ON

3. **Settings > Auth > SMTP Settings**
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Pass: [Your SendGrid API Key]
   Sender Email: noreply@yourdomain.com
   Sender Name: StudySpark
   ```

### 手順3: コード修正（本番デプロイ時）

#### 修正不要
- `app/api/auth/parent-register/route.ts` の `email_confirm: true` はそのまま
- 本番環境では `enable_confirmations` が ON になるため、Supabase が自動的に確認メールを送信

#### 確認が必要な箇所
- メールテンプレート内のリダイレクトURL
- `redirectTo` パラメータが本番ドメインを指すか確認

### 手順4: 環境変数の設定

本番環境の `.env.production.local` または Vercel/AWS の環境変数に追加:

```bash
# 本番Supabaseの設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# メール設定（Supabase Dashboard で設定する場合は不要）
# SMTP_PASS=your-sendgrid-api-key
```

---

## 🧪 ローカル開発での動作確認方法

### 方法1: Inbucket でメール内容を確認

1. **Supabase をローカルで起動**:
   ```bash
   npx supabase start
   ```

2. **Inbucket にアクセス**:
   - URL: http://localhost:54324
   - ブラウザで開く

3. **新規登録またはパスワードリセットを実行**

4. **Inbucket で受信メールを確認**:
   - 送信されるはずのメールが表示される
   - リンクをクリックして動作確認

### 方法2: メール確認を有効化してテスト（非推奨）

ローカル環境でメール確認フローをテストする場合:

1. `supabase/config.toml` を編集:
   ```toml
   [auth.email]
   enable_confirmations = true
   ```

2. `supabase restart` を実行

3. 新規登録すると Inbucket にメールが届く

4. **注意**: `app/api/auth/parent-register/route.ts` の `email_confirm: true` を `false` に変更する必要がある

---

## 📊 まとめ

### 現状
| 環境 | 新規登録メール | パスワードリセットメール | 動作 |
|------|--------------|----------------------|------|
| ローカル | 送信されない | 送信されない | ✅ 正常（仕様通り） |
| 本番（未設定） | 送信されない | 送信されない | ⚠️ SMTP設定が必要 |
| 本番（設定済み） | 送信される | 送信される | ✅ 期待通り |

### 推奨される対応

#### ローカル開発
- **現状維持** - メール送信なしで開発を継続
- 必要に応じて Inbucket でメール内容を確認

#### 本番環境デプロイ時
1. SendGrid または AWS SES を契約
2. Supabase Dashboard で SMTP 設定
3. `enable_confirmations` を ON に設定
4. メールテンプレートをカスタマイズ
5. 動作確認（ステージング環境推奨）

---

## 参考リンク

- [Supabase Local Development - Inbucket](https://supabase.com/docs/guides/local-development#inbucket)
- [Supabase Auth - SMTP Settings](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
