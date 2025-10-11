# Sentry セットアップガイド

StudySparkアプリケーションでエラートラッキングとパフォーマンスモニタリングを有効にするためのSentry設定手順です。

## 前提条件

- Sentryアカウント（無料プランで開始可能）
- 本番環境またはステージング環境へのデプロイ権限

## 1. Sentryプロジェクトの作成

1. [Sentry.io](https://sentry.io) にアクセスしてログイン
2. **Create Project** をクリック
3. プラットフォームとして **Next.js** を選択
4. プロジェクト名: `studyspark`（または任意）
5. チーム: デフォルトまたは新規作成
6. **Create Project** をクリック

## 2. 環境変数の設定

### ローカル開発環境 (`.env.local`)

```bash
# Sentry DSN (プロジェクト作成後に表示される)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/your-project-id

# Sentry組織名とプロジェクト名
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=studyspark

# ソースマップアップロード用認証トークン（任意 - ローカルビルド時は不要）
# SENTRY_AUTH_TOKEN=your-auth-token
```

### Vercel本番環境

Vercelダッシュボードで以下の環境変数を設定:

1. **Settings** → **Environment Variables** に移動
2. 以下の変数を追加:

| 変数名 | 値 | 対象環境 |
|--------|-----|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...` | Production, Preview |
| `SENTRY_ORG` | `your-org` | Production |
| `SENTRY_PROJECT` | `studyspark` | Production |
| `SENTRY_AUTH_TOKEN` | `your-token` | Production |

### Sentry認証トークンの作成

ソースマップアップロードに必要（本番ビルド時のみ）:

1. Sentry → **Settings** → **Account** → **Auth Tokens**
2. **Create New Token** をクリック
3. Scopes: `project:releases`, `project:write`
4. トークンをコピーして `SENTRY_AUTH_TOKEN` に設定

## 3. 動作確認

### ローカル環境でテスト

1. 開発サーバー起動:
   ```bash
   npm run dev
   ```

2. エラーを意図的に発生させるテストページを作成:
   ```typescript
   // app/test-sentry/page.tsx
   "use client"

   export default function TestSentryPage() {
     return (
       <button onClick={() => {
         throw new Error("Test Sentry Error - 動作確認用")
       }}>
         テストエラーを発生
       </button>
     )
   }
   ```

3. ブラウザで `/test-sentry` にアクセスしてボタンをクリック
4. Sentryダッシュボードでエラーが記録されることを確認

### 本番環境でテスト

1. Vercelにデプロイ
2. デプロイ完了後、同様にテストエラーを発生
3. Sentryで以下を確認:
   - エラー詳細
   - スタックトレース（ソースマップで解決済み）
   - ユーザーコンテキスト（user_id, role, email）

## 4. アラート設定

### Slackインテグレーション（推奨）

1. Sentry → **Settings** → **Integrations**
2. **Slack** を検索して **Add to Slack** をクリック
3. 通知先チャンネルを選択（例: `#studyspark-alerts`）
4. 権限を承認

### アラートルールの作成

1. Sentryプロジェクトページ → **Alerts** → **Create Alert**
2. 推奨ルール:

#### エラー頻度アラート
- **When**: An event is seen
- **If**: more than 10 times in 1 hour
- **Then**: Send notification via Slack to `#studyspark-alerts`
- **Name**: 高頻度エラー検出

#### 新規エラーアラート
- **When**: A new issue is created
- **If**: The issue is first seen
- **Then**: Send notification via Slack to `#studyspark-alerts`
- **Name**: 新規エラー検出

#### パフォーマンスアラート
- **When**: A transaction
- **If**: average duration is above 2000ms in 10 minutes
- **Then**: Send notification via Slack to `#studyspark-alerts`
- **Name**: ページ読み込み速度低下

### メール通知

デフォルトで有効。Sentry → **Settings** → **Notifications** で調整可能。

## 5. ユーザーコンテキストの設定（オプション）

エラー発生時にユーザー情報を含める場合、以下を追加:

```typescript
// app/layout.tsx または認証後のコンポーネント
import * as Sentry from "@sentry/nextjs"

// ユーザーログイン後に実行
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.display_name,
  role: user.role, // "student" | "parent" | "coach" | "admin"
})

// ログアウト時
Sentry.setUser(null)
```

## 6. カスタムタグとブレッドクラム（オプション）

```typescript
import * as Sentry from "@sentry/nextjs"

// カスタムタグ追加
Sentry.setTag("feature", "weekly-analysis")
Sentry.setTag("environment", process.env.NODE_ENV)

// ブレッドクラム追加（ユーザーアクション記録）
Sentry.addBreadcrumb({
  category: "user-action",
  message: "User clicked on weekly analysis button",
  level: "info",
})
```

## 7. パフォーマンスモニタリング

Sentryは自動的に以下をトラッキング:

- ページロード時間
- APIレスポンス時間
- データベースクエリ時間（Supabase呼び出し）

Performance → **Transactions** で確認可能。

## トラブルシューティング

### エラーが記録されない

1. `NEXT_PUBLIC_SENTRY_DSN` が正しく設定されているか確認
2. ブラウザのコンソールでSentry初期化メッセージを確認
3. ネットワークタブで `sentry.io` へのリクエストを確認

### ソースマップが解決されない

1. `SENTRY_AUTH_TOKEN` が正しく設定されているか確認
2. ビルドログで "Uploading source maps" が表示されるか確認
3. Sentry → **Settings** → **Source Maps** で確認

### ローカル環境でエラーが多すぎる

開発環境では無効化することも可能:

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_SENTRY_DSN
    : undefined,
  // ...
})
```

## 参考リンク

- [Sentry Next.js ドキュメント](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Alerts ガイド](https://docs.sentry.io/product/alerts/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
