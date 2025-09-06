# StudySpark 2025Fall

StudySpark学習管理システム - 生徒・保護者・指導者向けの学習記録・分析プラットフォーム

## 環境変数設定

### ローカル開発環境 (.env.local)

ローカル開発では `.env.local` ファイルに以下の環境変数を設定してください：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=your_session_secret_here_32_chars_min

# AI Configuration (GPT-5-mini)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini

# Development
NODE_ENV=development

# Feature Flags
ENABLE_AI_COACHING=true
ENABLE_PUSH_NOTIFICATIONS=false
```

### 本番環境 (Vercel)

本番環境では Vercel の Environment Variables に同名の変数を登録してください。

## 重要なセキュリティ事項

- **SUPABASE_SERVICE_ROLE_KEY** はserver-onlyで使用されます
- クライアント側からは参照できないよう静的に保証されています
- RLSをバイパスする権限を持つため、厳重な管理が必要です

## 開発環境セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
```bash
cp .env.local.example .env.local
# .env.local を編集して実際の値を設定
```

3. 開発サーバーの起動
```bash
npm run dev
```

## API エンドポイント

### Chat API
- `POST /api/chat` - OpenAI GPT-5-mini との対話API
- RFC 7807 (JSON Problem Details) 準拠のエラーレスポンス

### 学習記録API
- `GET /api/students/[studentId]/records` - 学習記録取得
- `POST /api/students/[studentId]/records` - 学習記録作成・更新
- `GET /api/students/[studentId]/calendar` - 月次学習カレンダーデータ

### 保護者ダッシュボードAPI
- `GET /api/parents/[parentId]/dashboard` - 子供の週次学習状況
- `GET /api/parents/[parentId]/coaching` - AI解釈・コーチング提案
- `GET /api/parents/[parentId]/students` - 保護者の子供一覧

## テスト

### E2Eテスト実行
```bash
npm run test:e2e
```

**注意:** Chat API のE2Eテストは `OPENAI_API_KEY` が設定されている場合のみ実行されます。未設定の場合は自動的にスキップされます。

## 技術スタック

- **Framework:** Next.js 14.2.x (App Router)
- **Language:** TypeScript 5.5.x
- **Database:** Supabase (PostgreSQL + RLS)
- **Authentication:** Supabase Auth
- **AI Integration:** OpenAI GPT-5-mini
- **UI Components:** Radix UI + Tailwind CSS
- **Validation:** Zod

## 実装済み機能

- ✅ 認証システム (T-070)
- ✅ 学習記録CRUD (T-010) 
- ✅ 保護者ダッシュボード・AI解釈 (T-030)
- ✅ カレンダーヒートマップAPI (T-020)
- ✅ Chat API (OpenAI統合)

## 開発ルール

- **D-007 (UIロック):** 既存UIのDOM/クラスは変更禁止。data-testid 追加のみ許可
- **Server-only:** 機密情報を扱うモジュールは `'server-only'` インポートを使用
- **RFC 7807:** API エラーは JSON Problem Details 形式で統一
- **RLS準拠:** データベースアクセスは Row Level Security に準拠

## ライセンス

[LICENSE](./LICENSE) を参照してください。