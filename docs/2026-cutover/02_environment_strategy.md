# 環境分離戦略

## 1. 概要

1月の二重運用期間中、本番環境（2025）とステージング環境（2026）を完全に分離する。
本ドキュメントでは、環境分離の方針・環境変数管理・混線防止策を定義する。

## 2. 環境構成

### 2.1 1月中の環境マッピング

| 環境 | ブランチ | Vercel環境 | Supabase DB | 用途 |
|------|---------|-----------|-------------|------|
| **本番** | release/2025 | Production | DB2025 (zlipaeanhcslhintxpej) | 現行サービス提供 |
| **ステージング** | main | Preview/Staging | DB2026 (新規作成) | 2026年度開発・検証 |
| **ローカル** | 任意 | - | ローカル or DB2026 | 開発作業 |

### 2.2 2/1切替後の環境マッピング

| 環境 | ブランチ | Vercel環境 | Supabase DB | 用途 |
|------|---------|-----------|-------------|------|
| **本番** | main | Production | DB2026 | 新年度サービス提供 |
| **アーカイブ** | - | - | DB2025 (読取専用) | 過年度参照（必要時） |

## 3. Supabase プロジェクト管理

### 3.1 DB2025（現行本番）

| 項目 | 値 |
|------|-----|
| プロジェクト名 | StudySpark-2025 |
| Project Ref | zlipaeanhcslhintxpej |
| URL | https://zlipaeanhcslhintxpej.supabase.co |
| 役割 | 1月中: 本番 → 2月以降: アーカイブ |

### 3.2 DB2026（新年度用）

| 項目 | 値 |
|------|-----|
| プロジェクト名 | StudySpark-2026 (新規作成) |
| Project Ref | (作成後に記入) |
| URL | (作成後に記入) |
| 役割 | 1月中: ステージング → 2月以降: 本番 |

### 3.3 Supabase プロジェクト作成チェックリスト

DB2026 作成時：

- [ ] Supabase ダッシュボードで新規プロジェクト作成
- [ ] リージョン: Northeast Asia (Tokyo) を選択
- [ ] Database Password を安全に保管
- [ ] Project URL, anon key, service_role key を取得
- [ ] 環境変数ドキュメントに記録

## 4. 環境変数管理

### 4.1 環境変数一覧

```
# ==================== Supabase ====================
NEXT_PUBLIC_SUPABASE_URL        # Supabase API URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase Anonymous Key
SUPABASE_SERVICE_ROLE_KEY       # Supabase Service Role Key (サーバーのみ)

# ==================== OpenAI ====================
OPENAI_API_KEY                  # OpenAI API Key
OPENAI_MODEL                    # 使用モデル (gpt-4o-mini)

# ==================== Langfuse ====================
LANGFUSE_PUBLIC_KEY             # Langfuse Public Key
LANGFUSE_SECRET_KEY             # Langfuse Secret Key
LANGFUSE_HOST                   # Langfuse Host URL
NEXT_PUBLIC_LANGFUSE_ENABLED    # Langfuse 有効フラグ

# ==================== Cron / Batch ====================
CRON_SECRET                     # Cron Job 認証シークレット

# ==================== App Config ====================
NODE_ENV                        # 環境識別 (development/production)
VERCEL_ENV                      # Vercel環境識別 (production/preview/development)
TZ                              # タイムゾーン (Asia/Tokyo)
NEXT_PUBLIC_LOCALE              # ロケール (ja-JP)
```

### 4.2 環境別の値設定

| 環境変数 | 本番 (DB2025) | ステージング (DB2026) | ローカル |
|---------|--------------|---------------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | https://zlipaeanhcslhintxpej.supabase.co | https://<DB2026_URL> | http://localhost:54321 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | (DB2025のkey) | (DB2026のkey) | (ローカルkey) |
| SUPABASE_SERVICE_ROLE_KEY | (DB2025のkey) | (DB2026のkey) | (ローカルkey) |
| NODE_ENV | production | production | development |

### 4.3 Vercel 環境変数設定

#### 本番環境（Production）

```
Environment: Production
Branch: release/2025 → (2/1以降) main

NEXT_PUBLIC_SUPABASE_URL = https://zlipaeanhcslhintxpej.supabase.co
                           → (2/1以降) DB2026のURL
NEXT_PUBLIC_SUPABASE_ANON_KEY = DB2025のkey → (2/1以降) DB2026のkey
SUPABASE_SERVICE_ROLE_KEY = DB2025のkey → (2/1以降) DB2026のkey
```

#### ステージング環境（Preview）

```
Environment: Preview
Branch: main

NEXT_PUBLIC_SUPABASE_URL = (DB2026のURL)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (DB2026のkey)
SUPABASE_SERVICE_ROLE_KEY = (DB2026のkey)
```

## 5. 混線防止策

### 5.1 絶対に守るべきルール

| # | ルール | 理由 |
|---|--------|------|
| 1 | **本番の環境変数を開発PCの .env.local に直接記載しない** | 誤操作で本番データを破壊するリスク |
| 2 | **DB2025 への書き込み操作を1月中は最小限に** | 保護対象のため |
| 3 | **環境変数の値をコードにハードコードしない** | セキュリティリスク |
| 4 | **切替作業時は必ず2名以上で確認** | ヒューマンエラー防止 |

### 5.2 命名規則

環境を明確に識別するための命名規則：

| 対象 | 命名規則 | 例 |
|------|---------|-----|
| Supabaseプロジェクト | `StudySpark-{年度}` | StudySpark-2025, StudySpark-2026 |
| Vercel環境 | Production / Preview | - |
| ブランチ | `release/{年度}` | release/2025 |
| 環境変数接尾辞 | `_2025` / `_2026` (必要時) | SUPABASE_URL_2025 |

### 5.3 安全確認チェックリスト

#### 開発作業開始時

```
□ 現在のブランチを確認
  $ git branch --show-current

□ .env.local の接続先を確認
  $ grep SUPABASE_URL .env.local

□ 接続先DBが意図したものか確認
  - ローカル開発 → localhost:54321 or DB2026
  - 本番修正テスト → DB2025 のステージング環境（推奨しない）
```

#### デプロイ前

```
□ デプロイ対象ブランチの確認
  - release/2025 → 本番環境
  - main → ステージング環境

□ Vercel の環境変数が正しい DB を指しているか確認
  - Production → DB2025 (1月中)
  - Preview → DB2026

□ マイグレーションが必要な場合、対象DBを再確認
```

### 5.4 事故防止のための技術的対策

#### A. 環境識別バナー（中止）

> **2026-02-07**: 即日切替完了により二重運用期間が発生しなかったため、環境識別バナーは不要と判断し中止。
> 一時実装した `components/environment-banner.tsx` は削除済み。
> 将来二重運用が必要になった場合は `NEXT_PUBLIC_ENV_LABEL` 環境変数ベースで再実装可能。

#### B. DB接続ログ（開発時）

起動時に接続先を出力：

```typescript
// lib/supabase/server.ts
if (process.env.NODE_ENV === 'development') {
  console.log(`[Supabase] Connecting to: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
}
```

## 6. Secrets 管理

### 6.1 保管場所

| シークレット種別 | 保管場所 | アクセス権限 |
|-----------------|---------|-------------|
| Supabase Service Role Key | Vercel Secrets / 1Password | 管理者のみ |
| OpenAI API Key | Vercel Secrets / 1Password | 管理者のみ |
| Langfuse Keys | Vercel Secrets | 管理者のみ |
| Database Password | Supabase Dashboard / 1Password | 管理者のみ |

### 6.2 ローテーション計画

| シークレット | ローテーション頻度 | タイミング |
|-------------|------------------|-----------|
| Supabase Service Role Key | 年度切替時 | 2/1切替時に DB2026 のキーに切替 |
| OpenAI API Key | 必要時 | 漏洩懸念時のみ |
| CRON_SECRET | 年度切替時 | 2/1切替時に再生成推奨 |

## 7. 環境別機能フラグ

### 7.1 機能フラグ一覧

```
NEXT_PUBLIC_AI_ENABLED          # AI機能有効化
NEXT_PUBLIC_DEBUG_MODE          # デバッグモード
NEXT_PUBLIC_EMAIL_CONFIRMATION_REQUIRED  # メール確認必須化
```

### 7.2 環境別設定

| フラグ | 本番 | ステージング | ローカル |
|--------|------|-------------|---------|
| NEXT_PUBLIC_AI_ENABLED | true | true | false (APIコスト削減) |
| NEXT_PUBLIC_DEBUG_MODE | false | true | true |
| NEXT_PUBLIC_EMAIL_CONFIRMATION_REQUIRED | true | false | false |

## 8. 切替時の環境変数変更手順

### 8.1 事前準備（1/31まで）

1. DB2026 の環境変数をドキュメント化
2. Vercel の環境変数変更手順を確認
3. 変更する環境変数の一覧を作成

### 8.2 切替当日（2/1）

```
1. Vercel Production 環境の環境変数を変更:
   NEXT_PUBLIC_SUPABASE_URL      → DB2026のURL
   NEXT_PUBLIC_SUPABASE_ANON_KEY → DB2026のkey
   SUPABASE_SERVICE_ROLE_KEY     → DB2026のkey

2. Production ブランチを main に変更

3. 再デプロイ実行

4. 動作確認
```

詳細は `04_cutover_runbook.md` を参照。

## 9. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-02 | Claude Code | 初版作成 |
