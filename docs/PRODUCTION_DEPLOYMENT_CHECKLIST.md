# 本番デプロイチェックリスト - Langfuse実装

## 📋 概要

このドキュメントは、`feature/langfuse-implementation`を本番環境にデプロイするための実践的なチェックリストです。各ステップを順番に実行してください。

**作成日**: 2025-11-14
**対象ブランチ**: `feature/langfuse-implementation`
**前提**: ローカル環境での実装・テスト完了済み

---

## ⚠️ 重要な前提条件

- [ ] ローカル環境で全機能が正常動作していることを確認済み
- [ ] `feature/langfuse-implementation`ブランチがGitHubにプッシュ済み
- [ ] 本番Supabaseへのアクセス権限がある
- [ ] Vercelプロジェクトへのアクセス権限がある
- [ ] Langfuseアカウントがある（https://us.cloud.langfuse.com）

---

## 📝 デプロイフロー概要

```
フェーズ1: 本番環境準備（マイグレーション＋環境変数）
    ↓
フェーズ2: GitマージとVercelデプロイ
    ↓
フェーズ3: 動作確認とテスト
    ↓
フェーズ4: 本番運用開始
```

---

## 🚀 フェーズ1: 本番環境準備

### ステップ1.1: Langfuse本番プロジェクト確認

Langfuseに「StudySpark」プロジェクトが既に作成済みとのことなので、APIキーを取得します。

**手順:**

1. https://us.cloud.langfuse.com にアクセスしてログイン
2. 「StudySpark」プロジェクトを選択
3. 左サイドバー → **Settings** → **API Keys**
4. 以下の値をメモ（後でVercelに設定）:
   ```
   LANGFUSE_PUBLIC_KEY: pk-lf-xxxxx
   LANGFUSE_SECRET_KEY: sk-lf-xxxxx
   ```

**チェック:**
- [ ] `LANGFUSE_PUBLIC_KEY`を取得
- [ ] `LANGFUSE_SECRET_KEY`を取得
- [ ] 安全な場所にメモ（パスワードマネージャー等）

---

### ステップ1.2: CRON_SECRET生成

本番用の新しいCRON_SECRETを生成します（セキュリティのためローカルとは別の値を使用）。

**コマンド:**
```bash
openssl rand -base64 32
```

**出力例:**
```
xY9mK3pQ7vN2jL5dF8gH1wR4sT6uI0oP2cV7bN9mX5kL3jH8fD4gS6aQ1wE3rT5y=
```

**チェック:**
- [ ] CRON_SECRETを生成
- [ ] 安全な場所にメモ

---

### ステップ1.3: Vercel環境変数設定

Vercelプロジェクトに環境変数を設定します。

**手順:**

1. Vercel Dashboard → あなたのプロジェクトを選択
2. **Settings** → **Environment Variables**
3. 以下の変数を追加（Environment: **Production**）:

| Variable Name | Value | 備考 |
|--------------|-------|------|
| `LANGFUSE_PUBLIC_KEY` | pk-lf-xxxxx | ステップ1.1で取得 |
| `LANGFUSE_SECRET_KEY` | sk-lf-xxxxx | ステップ1.1で取得 |
| `LANGFUSE_HOST` | `https://us.cloud.langfuse.com` | 固定値 |
| `NEXT_PUBLIC_LANGFUSE_ENABLED` | `true` | 固定値 |
| `CRON_SECRET` | ステップ1.2で生成した値 | 本番用新規値 |
| `SLACK_WEBHOOK_URL` | 既存のSlack Webhook URL | 既に取得済み |

**注意:**
- `OPENAI_API_KEY`などの既存変数は変更不要
- `SUPABASE_SERVICE_ROLE_KEY`が設定されているか確認（Cron用）

**チェック:**
- [ ] `LANGFUSE_PUBLIC_KEY`を設定
- [ ] `LANGFUSE_SECRET_KEY`を設定
- [ ] `LANGFUSE_HOST`を設定
- [ ] `NEXT_PUBLIC_LANGFUSE_ENABLED`を設定
- [ ] `CRON_SECRET`を設定
- [ ] `SLACK_WEBHOOK_URL`を設定
- [ ] `SUPABASE_SERVICE_ROLE_KEY`が存在することを確認

---

### ステップ1.4: 本番Supabaseへのマイグレーション適用

**⚠️ 最重要ステップ**: このマイグレーションを適用しないと、Cronジョブが動作しません。

**適用が必要なマイグレーション:**
1. `20251114000001_create_parent_students_view.sql` - parent_studentsビュー作成
2. `20251114000002_add_student_id_to_ai_cache.sql` - ai_cache.student_idカラム＋RLS追加

#### 方法: Supabase Dashboard経由（推奨）

**手順:**

1. Supabase Dashboard → あなたのプロジェクトを選択
2. 左サイドバー → **SQL Editor**
3. 新しいクエリを作成

**マイグレーション1を適用:**

```sql
-- ============================================================================
-- 20251114000001_create_parent_students_view.sql
-- 説明: parent_studentsビューの作成
-- 目的: PostgRESTで parent_students!inner() リレーションを使えるようにする
-- ============================================================================

-- parent_studentsビューを作成
-- これにより、parent_child_relationsテーブルを parent_students としてアクセス可能にする
CREATE OR REPLACE VIEW public.parent_students AS
SELECT
  pcr.id,
  pcr.parent_id,
  pcr.student_id,
  pcr.relation_type,
  pcr.created_at,
  s.user_id,
  s.login_id,
  s.full_name,
  s.grade,
  s.course,
  s.created_at AS student_created_at,
  s.updated_at AS student_updated_at
FROM public.parent_child_relations pcr
JOIN public.students s ON s.id = pcr.student_id;

-- RLSを有効にする（security_invoker モード）
ALTER VIEW public.parent_students SET (security_invoker = on);

-- コメント追加
COMMENT ON VIEW public.parent_students IS '保護者-生徒関係のビュー。PostgREST joinクエリ用。';
```

**実行** → 成功を確認

**マイグレーション2を適用:**

```sql
-- ============================================================================
-- 20251114000002_add_student_id_to_ai_cache.sql
-- ai_cacheテーブルにstudent_idカラムを追加してRLSポリシーを設定
-- 保護者が自分の子どものキャッシュを読めるようにする
-- ============================================================================

-- 1. student_idカラムを追加
ALTER TABLE public.ai_cache
ADD COLUMN IF NOT EXISTS student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_ai_cache_student_id ON public.ai_cache(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_cache_key_student ON public.ai_cache(cache_key, student_id);

-- 2. RLSポリシーを追加

-- 既存のポリシーを削除（もしあれば）
DROP POLICY IF EXISTS "Parents can read their children's daily status cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Students can read their own daily coach cache" ON public.ai_cache;

-- 保護者が自分の子どものdaily_statusキャッシュを読めるポリシー
CREATE POLICY "Parents can read their children's daily status cache"
ON public.ai_cache
FOR SELECT
TO authenticated
USING (
  cache_type = 'daily_status'
  AND student_id IN (
    SELECT pcr.student_id
    FROM parent_child_relations pcr
    JOIN parents p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- 生徒が自分のdaily_coachキャッシュを読めるポリシー
CREATE POLICY "Students can read their own daily coach cache"
ON public.ai_cache
FOR SELECT
TO authenticated
USING (
  cache_type = 'daily_coach'
  AND student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.user_id = auth.uid()
  )
);

-- 3. コメント追加
COMMENT ON COLUMN public.ai_cache.student_id IS '生徒ID（daily_statusとdaily_coachキャッシュ用）';
```

**実行** → 成功を確認

**確認クエリ:**

```sql
-- parent_studentsビューが作成されているか確認
SELECT * FROM public.parent_students LIMIT 1;

-- ai_cache.student_idカラムが存在するか確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_cache' AND column_name = 'student_id';

-- RLSポリシーが作成されているか確認
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'ai_cache';
```

**チェック:**
- [ ] マイグレーション1を実行
- [ ] マイグレーション2を実行
- [ ] `parent_students`ビューが存在することを確認
- [ ] `ai_cache.student_id`カラムが存在することを確認
- [ ] RLSポリシーが2つ作成されていることを確認

---

## 🔄 フェーズ2: GitマージとVercelデプロイ

### ステップ2.1: feature/fix-goal-setting-end-dates をmainにマージ（オプション）

[GIT_MERGE_STRATEGY.md](./GIT_MERGE_STRATEGY.md)に従い、既存の修正を先にmainにマージします。

**手順:**

```bash
# mainブランチに切り替え
git checkout main
git pull origin main

# feature/fix-goal-setting-end-datesをマージ
git merge feature/fix-goal-setting-end-dates

# コンフリクトがあれば解決

# ビルドテスト
npm run build

# mainにプッシュ
git push origin main
```

**チェック:**
- [ ] `feature/fix-goal-setting-end-dates`をmainにマージ
- [ ] ビルド成功を確認
- [ ] GitHubにプッシュ
- [ ] Vercel自動デプロイ完了を確認
- [ ] 本番環境で既存機能が正常動作することを確認

---

### ステップ2.2: feature/langfuse-implementation をmainにマージ

Langfuse実装をmainにマージします。

**手順:**

```bash
# mainブランチを最新化
git checkout main
git pull origin main

# feature/langfuse-implementationをマージ
git merge feature/langfuse-implementation

# コンフリクトがあれば解決

# ビルドテスト
npm run build

# Lintチェック
npm run lint

# mainにプッシュ
git push origin main
```

**チェック:**
- [ ] `feature/langfuse-implementation`をmainにマージ
- [ ] ビルド成功を確認
- [ ] Lint成功を確認
- [ ] GitHubにプッシュ
- [ ] Vercel自動デプロイ開始を確認

---

### ステップ2.3: Vercelデプロイ完了確認

Vercel Dashboardでデプロイ状況を確認します。

**手順:**

1. Vercel Dashboard → あなたのプロジェクト
2. **Deployments** タブ
3. 最新のデプロイが **Ready** になるまで待機（通常2-5分）
4. デプロイログを確認:
   - ビルドエラーがないか
   - 警告が増えていないか
   - 環境変数が正しくロードされているか

**チェック:**
- [ ] Vercelデプロイが **Ready** 状態
- [ ] ビルドエラーなし
- [ ] 警告の内容を確認（新規警告があれば調査）

---

## ✅ フェーズ3: 動作確認とテスト

### ステップ3.1: 本番環境の基本動作確認

まず既存機能が正常動作することを確認します。

**確認項目:**

1. **ログイン機能**
   - [ ] 生徒ログイン成功（既存ユーザー）
   - [ ] 保護者ログイン成功（既存ユーザー）

2. **ダッシュボード表示**
   - [ ] 生徒ダッシュボードが表示される
   - [ ] 保護者ダッシュボードが表示される

3. **既存機能**
   - [ ] 学習記録（スパーク）が動作
   - [ ] 目標設定（ゴールナビ）が動作
   - [ ] 振り返り（リフレクト）が動作

**問題があれば**: このフェーズで失敗した場合は、Vercel Dashboardから前回のデプロイにロールバック

---

### ステップ3.2: デモ2家族を本番環境に投入

マイグレーションが正しく適用されたか確認するため、デモユーザーを投入します。

**⚠️ 注意**: 本番Supabaseに接続するため、環境変数を一時的に変更します。

**手順:**

1. `.env.production.local`ファイルを作成（または既存のものを確認）:

```bash
# 本番Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://zlipaeanhcslhintxpej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg0MjcsImV4cCI6MjA3NDk4NDQyN30.MhwWJSJEP4ipGWV9OWfn3RUxC2u23i-5CAGUYWDOTKg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y

# その他必要な変数
OPENAI_API_KEY=（本番用）
```

2. スクリプトを実行:

```bash
# 本番環境に接続してシード実行
NODE_ENV=production npx tsx scripts/seed-2families-data.ts
```

3. 実行後、本番Supabaseで確認:

```sql
-- 2家族（4ユーザー）が作成されたか確認
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE '%demo%'
ORDER BY created_at DESC
LIMIT 4;

-- parent_child_relations に2レコードあるか確認
SELECT * FROM parent_child_relations
WHERE parent_id IN (
  SELECT id FROM parents WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%demo%'
  )
);
```

**チェック:**
- [ ] シードスクリプト実行成功
- [ ] 本番DBに2家族（4ユーザー）が作成された
- [ ] `parent_child_relations`に2レコード存在
- [ ] プロフィール名が「今日さん」「明日さん」などで表示される（「ユーザーXXXX」ではない）

---

### ステップ3.3: Cronジョブ手動実行テスト（推奨: curl）

Cronジョブが正常動作するか、手動で実行してテストします。

**⚠️ 前提**: ステップ3.2でデモユーザーを投入済み

**手順:**

1. 本番URLとCRON_SECRETを確認:
   ```
   本番URL: https://your-domain.vercel.app
   CRON_SECRET: （ステップ1.2で生成した値）
   ```

2. curlでAPIを叩く:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/generate-parent-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -v
```

**期待される結果:**

```json
{
  "success": true,
  "generated": 2,
  "errors": 0,
  "results": [
    {
      "studentId": 123,
      "studentName": "今日さん",
      "success": true
    },
    {
      "studentId": 124,
      "studentName": "明日さん",
      "success": true
    }
  ]
}
```

**レスポンスステータス**: `200 OK`

3. Slack通知を確認:
   - Slackチャンネルに成功通知が届いているか

4. Langfuseトレース確認:
   - https://us.cloud.langfuse.com にアクセス
   - 「StudySpark」プロジェクトを選択
   - **Traces** タブ
   - 2件のトレースが記録されているか確認
   - トレース詳細で以下を確認:
     - `user_id`が正しい
     - `metadata`に`student_name`がある
     - `output`にAI生成メッセージがある
     - エラーがない

5. 本番DBでキャッシュ確認:

```sql
-- ai_cacheにレコードが作成されているか確認
SELECT
  id,
  entity_id,
  cache_key,
  cache_type,
  student_id,
  langfuse_trace_id,
  created_at
FROM ai_cache
WHERE cache_type = 'daily_status'
ORDER BY created_at DESC
LIMIT 5;
```

**チェック:**
- [ ] curl実行成功（200 OK）
- [ ] レスポンスJSON正常
- [ ] Slack通知受信
- [ ] Langfuseに2件のトレース記録
- [ ] 本番DBに`ai_cache`レコード作成
- [ ] `ai_cache.student_id`にデータが入っている

---

### ステップ3.4: 保護者ダッシュボードで「今日の様子」表示確認

デモ保護者でログインし、AIメッセージが表示されることを確認します。

**手順:**

1. 本番環境にアクセス: `https://your-domain.vercel.app`
2. デモ保護者でログイン:
   ```
   Email: demo-parent1@example.com
   Password: DemoParent1!
   ```
3. 保護者ダッシュボードを表示
4. 「今日の様子」セクションにAIメッセージが表示されることを確認

**期待される表示:**
```
今日の様子

今日もさんは一生懸命に取り組まれており、社会では39/52問正解（正答率75%）...
```

**チェック:**
- [ ] 保護者でログイン成功
- [ ] 「今日の様子」にAIメッセージが表示される
- [ ] メッセージ内容が適切（生徒名、科目、正答率など）
- [ ] エラーが表示されない

---

### ステップ3.5: 既存15家族で動作確認（抜き取り）

既存ユーザーでも正常動作するか、無作為に3-5家族でテストします。

**手順:**

1. 本番DBから既存の保護者をピックアップ:

```sql
-- 既存保護者を5名取得
SELECT
  p.id,
  u.email,
  pr.nickname
FROM parents p
JOIN auth.users u ON u.id = p.user_id
JOIN profiles pr ON pr.id = p.user_id
WHERE u.email NOT LIKE '%demo%'
LIMIT 5;
```

2. 各保護者でログインし、以下を確認:
   - [ ] ログイン成功
   - [ ] ダッシュボード表示
   - [ ] 「今日の様子」セクションが表示される（データがあれば）
   - [ ] エラーが発生しない

**問題があれば**: エラーログを確認し、RLS設定やマイグレーション適用を再確認

---

## 🎯 フェーズ4: 本番運用開始

### ステップ4.1: Cron自動実行の設定確認

Vercelで設定されているCronが正しいか確認します。

**手順:**

1. Vercel Dashboard → あなたのプロジェクト
2. **Settings** → **Cron Jobs**
3. 以下のCronが設定されているか確認:

```
Path: /api/cron/generate-parent-status
Schedule: 0 18 * * *
Description: 保護者向け「今日の様子」自動生成（毎日JST午前3時）
```

**注意**: `0 18 * * *` = UTC 18:00 = JST 03:00（翌日）

**チェック:**
- [ ] Cron設定が存在
- [ ] スケジュールが `0 18 * * *`
- [ ] Pathが `/api/cron/generate-parent-status`

---

### ステップ4.2: 初回自動実行の監視

翌朝3時のCron自動実行を監視します。

**監視タイミング**: デプロイ翌日の午前3:00-3:30（JST）

**手順:**

1. **午前3:00-3:05**: Vercel Logsを監視
   - Vercel Dashboard → Functions → Logs
   - `/api/cron/generate-parent-status`のログを確認

2. **午前3:05-3:10**: Slack通知を確認
   - 成功通知が届いているか

3. **午前3:10-3:30**: Langfuseダッシュボードを確認
   - https://us.cloud.langfuse.com
   - 「StudySpark」プロジェクト → Traces
   - 全生徒分のトレースが記録されているか
   - エラーがないか

4. **午前9:00以降**: 実際の保護者に動作確認を依頼
   - 「今日の様子」が表示されているか確認してもらう

**チェック:**
- [ ] Cron実行ログ確認（午前3時）
- [ ] Slack通知受信
- [ ] Langfuseトレース記録確認
- [ ] 保護者からのフィードバック確認

---

### ステップ4.3: 初週の日次監視

運用開始後1週間は、毎日以下を確認します。

**毎日のチェック項目（所要時間: 5-10分）:**

1. **Cron実行状況**
   - [ ] Vercel Logsで実行ログ確認
   - [ ] エラーがないか

2. **Slack通知**
   - [ ] 成功通知が届いているか
   - [ ] 生成数が適切か（全生徒分）

3. **Langfuseダッシュボード**
   - [ ] トレース数の推移
   - [ ] エラー率
   - [ ] レイテンシ（2-5秒が正常）

4. **OpenAI APIコスト**
   - [ ] 日次コストが想定範囲内か
   - [ ] 異常なスパイクがないか

5. **ユーザーフィードバック**
   - [ ] 保護者からの問い合わせ確認
   - [ ] 不具合報告がないか

**問題発生時**: [トラブルシューティング](#-トラブルシューティング)セクション参照

---

## 🔧 トラブルシューティング

### 問題1: Cronジョブが失敗する

**症状**: Vercel Logsにエラー、Slack通知が来ない

**原因と対処:**

1. **CRON_SECRETが間違っている**
   - Vercel環境変数を再確認
   - ステップ1.3で設定した値と一致するか

2. **マイグレーションが未適用**
   - ステップ1.4を再実行
   - `parent_students`ビューが存在するか確認

3. **SUPABASE_SERVICE_ROLE_KEYが未設定**
   - Vercel環境変数で`SUPABASE_SERVICE_ROLE_KEY`を確認
   - 本番Supabaseの値と一致するか

**デバッグ方法:**

```bash
# Vercel Logsで詳細エラーを確認
vercel logs --follow

# または curl で手動実行してエラーメッセージを確認
curl -X POST https://your-domain.vercel.app/api/cron/generate-parent-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -v
```

---

### 問題2: 保護者が「今日の様子」を見られない

**症状**: 保護者ダッシュボードで「データがありません」と表示される

**原因と対処:**

1. **RLSポリシーが未適用**
   - ステップ1.4のマイグレーション2を再確認
   - RLSポリシーが2つ作成されているか確認:
     ```sql
     SELECT policyname FROM pg_policies WHERE tablename = 'ai_cache';
     ```

2. **ai_cache.student_idが空**
   - Cronジョブが古いコードで実行された可能性
   - 再デプロイして最新コードを適用
   - Cronを手動実行して`student_id`が保存されるか確認:
     ```sql
     SELECT student_id, cache_key FROM ai_cache ORDER BY created_at DESC LIMIT 5;
     ```

3. **parent_child_relationsにデータがない**
   - 保護者-生徒の関係が登録されているか確認:
     ```sql
     SELECT * FROM parent_child_relations
     WHERE parent_id = (SELECT id FROM parents WHERE user_id = 'xxx');
     ```

---

### 問題3: Langfuseにトレースが記録されない

**症状**: Langfuseダッシュボードにトレースが表示されない

**原因と対処:**

1. **環境変数が未設定**
   - Vercel環境変数を確認:
     - `LANGFUSE_PUBLIC_KEY`
     - `LANGFUSE_SECRET_KEY`
     - `LANGFUSE_HOST`
     - `NEXT_PUBLIC_LANGFUSE_ENABLED`

2. **プロジェクトが間違っている**
   - ローカル用（StudySpark-Local）と本番用（StudySpark）を混同していないか
   - 環境変数のキーが本番用プロジェクトのものか確認

3. **ネットワークエラー**
   - Vercel Logsでネットワークエラーがないか確認
   - Langfuseのステータスページ確認: https://status.langfuse.com

---

### 問題4: 「昨日の様子です」が表示されない

**症状**: 昨日のキャッシュが表示されるべき時にフォールバックメッセージが出る

**原因と対処:**

1. **RLSで昨日のキャッシュが読めない**
   - `ai_cache.student_id`が正しく保存されているか確認
   - RLSポリシーが適用されているか確認

2. **キャッシュキーの日付フォーマットが違う**
   - タイムゾーンがAsia/Tokyoになっているか確認
   - キャッシュキーが `daily_status_yesterday_{studentId}_{YYYY-MM-DD}` 形式か確認

---

## 🔄 ロールバック手順（緊急時）

### Vercel経由でロールバック

**最も安全で推奨**

1. Vercel Dashboard → Deployments
2. 前回のデプロイ（問題が発生する前）を選択
3. **Promote to Production** をクリック
4. 数分でロールバック完了

**チェック:**
- [ ] 前回デプロイにロールバック完了
- [ ] 既存機能が正常動作することを確認
- [ ] 問題が解消したことを確認

---

### Git経由でロールバック

**緊急時のみ使用**

```bash
# mainブランチで特定のコミットに戻す
git checkout main
git log --oneline -10  # 戻すコミットを確認

# revertで安全に戻す（推奨）
git revert HEAD
git push origin main

# または強制的に戻す（注意）
git reset --hard <commit-hash>
git push origin main --force
```

---

## 📊 運用指標（KPI）

運用開始後、以下の指標を週次で確認します。

### 1. 実行成功率
- **目標**: 99%以上
- **確認方法**: Slack通知 ÷ 期待実行回数（7日）

### 2. 平均レイテンシ
- **目標**: 1生徒あたり2-5秒
- **確認方法**: Langfuseダッシュボード → Traces → Duration

### 3. エラー率
- **目標**: 1%以下
- **確認方法**: Langfuseダッシュボード → Traces → Error率

### 4. OpenAI APIコスト
- **目標**: 月額$XX以下（想定値を設定）
- **確認方法**: OpenAI Dashboard

### 5. ユーザー満足度
- **目標**: 肯定的フィードバック80%以上
- **確認方法**: 保護者からのフィードバック収集

---

## 📞 連絡先・リソース

### 外部サービス

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Langfuse Dashboard**: https://us.cloud.langfuse.com
- **OpenAI Dashboard**: https://platform.openai.com

### ドキュメント

- [デプロイ計画](./DEPLOYMENT_PLAN_DAILY_AI.md) - 詳細な技術仕様
- [Gitマージ戦略](./GIT_MERGE_STRATEGY.md) - マージ手順
- [作業サマリー](./WORK_SUMMARY_2025-11-14.md) - 実装履歴
- [CHANGELOG](../CHANGELOG.md) - 変更履歴

---

## ✅ 最終確認チェックリスト

デプロイ完了前に、すべてチェックが入っていることを確認してください。

### フェーズ1: 本番環境準備
- [ ] Langfuse APIキー取得
- [ ] CRON_SECRET生成
- [ ] Vercel環境変数設定（7個）
- [ ] 本番Supabaseにマイグレーション2つ適用
- [ ] マイグレーション適用確認（ビュー、カラム、RLS）

### フェーズ2: GitマージとVercelデプロイ
- [ ] `feature/fix-goal-setting-end-dates`をmainにマージ（オプション）
- [ ] `feature/langfuse-implementation`をmainにマージ
- [ ] Vercelデプロイ完了
- [ ] ビルドエラーなし

### フェーズ3: 動作確認とテスト
- [ ] 既存機能の動作確認
- [ ] デモ2家族投入
- [ ] Cronジョブ手動実行テスト（curl）
- [ ] Slack通知確認
- [ ] Langfuseトレース確認
- [ ] 保護者ダッシュボードで「今日の様子」表示確認
- [ ] 既存15家族の抜き取りテスト

### フェーズ4: 本番運用開始
- [ ] Cron設定確認
- [ ] 初回自動実行監視（翌朝3時）
- [ ] 初週の日次監視計画作成

---

**作成日**: 2025-11-14
**最終更新**: 2025-11-14
**作成者**: Claude Code
**バージョン**: 1.0

このチェックリストに沿って作業を進めれば、安全に本番デプロイを完了できます。不明点があれば、各ドキュメントを参照してください。
