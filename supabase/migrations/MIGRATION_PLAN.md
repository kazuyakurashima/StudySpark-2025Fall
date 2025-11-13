# Langfuse実装マイグレーション計画

## Phase 1 Day 5: データベース構築

### マイグレーション実行順序

実行順序が重要な理由：
1. `langfuse_traces` テーブルを先に作成（他のテーブルが参照する）
2. 既存テーブルへの非正規化カラム追加は後で実行
3. 外部キー制約は最後に追加

---

### マイグレーション1: Langfuseコアテーブル

**ファイル**: `20251113000003_add_langfuse_core.sql`

**作成テーブル**:
1. `langfuse_traces` - トレース記録（メインテーブル）
2. `langfuse_scores` - スコア記録
3. `langfuse_batch_runs` - バッチ実行履歴
4. `rate_limit_logs` - レート制限ログ

**テーブル構造**:

```sql
-- 1. langfuse_traces (最初に作成)
CREATE TABLE langfuse_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ai_coach_message', 'encouragement_message', 'daily_status', 'reflection')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_langfuse_traces_entity ON langfuse_traces(entity_type, entity_id);
CREATE INDEX idx_langfuse_traces_user_id ON langfuse_traces(user_id);
CREATE INDEX idx_langfuse_traces_created_at ON langfuse_traces(created_at);

-- 2. langfuse_scores (langfuse_tracesを参照)
CREATE TABLE langfuse_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES langfuse_traces(trace_id) ON DELETE CASCADE,
  score_name TEXT NOT NULL CHECK (score_name IN ('user_feedback', 'mission_completed', 'next_day_activity', 'weekly_completion_rate')),
  value NUMERIC NOT NULL CHECK (value IN (0, 1)),
  comment TEXT,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_langfuse_scores_trace_id ON langfuse_scores(trace_id);
CREATE INDEX idx_langfuse_scores_status ON langfuse_scores(status);
CREATE INDEX idx_langfuse_scores_created_at ON langfuse_scores(created_at);

-- 3. langfuse_batch_runs
CREATE TABLE langfuse_batch_runs (
  id UUID PRIMARY KEY,
  batch_name TEXT NOT NULL,
  scores_created INT NOT NULL DEFAULT 0,
  scores_sent INT NOT NULL DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_langfuse_batch_runs_batch_name ON langfuse_batch_runs(batch_name);
CREATE INDEX idx_langfuse_batch_runs_created_at ON langfuse_batch_runs(created_at);

-- 4. rate_limit_logs
CREATE TABLE rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rate_limit_logs_unique ON rate_limit_logs(user_id, endpoint, window_start);
CREATE INDEX idx_rate_limit_logs_user_id ON rate_limit_logs(user_id);
```

---

### マイグレーション2: 既存テーブルへの非正規化カラム追加

**ファイル**: `20251113000004_add_langfuse_denormalized_columns.sql`

**変更テーブル**:
1. `ai_coach_messages`
2. `encouragement_messages`
3. `reflections`

**実行内容**:

```sql
-- ai_coach_messages に langfuse_trace_id カラム追加
ALTER TABLE ai_coach_messages
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_ai_coach_messages_langfuse_trace_id ON ai_coach_messages(langfuse_trace_id);

-- encouragement_messages に langfuse_trace_id カラム追加
ALTER TABLE encouragement_messages
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_encouragement_messages_langfuse_trace_id ON encouragement_messages(langfuse_trace_id);

-- reflections に langfuse_trace_id カラム追加
ALTER TABLE reflections
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_reflections_langfuse_trace_id ON reflections(langfuse_trace_id);
```

---

### マイグレーション3: RLSポリシー設定

**ファイル**: `20251113000005_add_langfuse_rls_policies.sql`

**設定内容**:

```sql
-- langfuse_traces の RLS 有効化
ALTER TABLE langfuse_traces ENABLE ROW LEVEL SECURITY;

-- 自分のトレースのみ閲覧可能
CREATE POLICY "Users can view their own traces"
ON langfuse_traces FOR SELECT
USING (auth.uid() = user_id);

-- langfuse_scores の RLS 有効化
ALTER TABLE langfuse_scores ENABLE ROW LEVEL SECURITY;

-- 自分のトレースに紐づくスコアのみ閲覧可能
CREATE POLICY "Users can view scores for their traces"
ON langfuse_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM langfuse_traces
    WHERE langfuse_traces.trace_id = langfuse_scores.trace_id
    AND langfuse_traces.user_id = auth.uid()
  )
);

-- 自分のトレースにスコアを追加可能
CREATE POLICY "Users can insert scores for their traces"
ON langfuse_scores FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM langfuse_traces
    WHERE langfuse_traces.trace_id = langfuse_scores.trace_id
    AND langfuse_traces.user_id = auth.uid()
  )
);
```

---

## 実行手順

### ローカル環境

```bash
# 1. マイグレーションファイル作成（上記3ファイル）
# 2. ローカルDBリセット（テストデータも再投入される）
npx supabase db reset

# 3. マイグレーション確認
npx supabase migration list
```

### 本番環境

```bash
# 1. マイグレーション適用
npx supabase migration up --db-url $DATABASE_URL

# 2. 確認
psql $DATABASE_URL -c "\dt langfuse_*"
```

---

## 注意事項

### 外部キー制約の順序

1. `langfuse_traces` → `auth.users` (user_id)
2. `langfuse_scores` → `langfuse_traces` (trace_id)
3. 既存テーブル → `langfuse_traces` (langfuse_trace_id)

この順序を守ることで、循環参照を避けられます。

### ON DELETE の設定

- `user_id`: `CASCADE` - ユーザー削除時にトレースも削除
- `trace_id`: `CASCADE` - トレース削除時にスコアも削除
- `langfuse_trace_id`: `SET NULL` - トレース削除時もエンティティは残す（非正規化）

### パフォーマンス考慮

以下のカラムにインデックスを設定済み：
- `langfuse_traces`: entity_type+entity_id, user_id, created_at
- `langfuse_scores`: trace_id, status, created_at
- 既存テーブル: langfuse_trace_id

---

## ロールバック計画

万が一問題が発生した場合：

```sql
-- マイグレーション3のロールバック
DROP POLICY "Users can insert scores for their traces" ON langfuse_scores;
DROP POLICY "Users can view scores for their traces" ON langfuse_scores;
DROP POLICY "Users can view their own traces" ON langfuse_traces;
ALTER TABLE langfuse_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE langfuse_traces DISABLE ROW LEVEL SECURITY;

-- マイグレーション2のロールバック
ALTER TABLE reflections DROP COLUMN langfuse_trace_id;
ALTER TABLE encouragement_messages DROP COLUMN langfuse_trace_id;
ALTER TABLE ai_coach_messages DROP COLUMN langfuse_trace_id;

-- マイグレーション1のロールバック
DROP TABLE rate_limit_logs;
DROP TABLE langfuse_batch_runs;
DROP TABLE langfuse_scores;
DROP TABLE langfuse_traces;
```

---

## 検証項目

マイグレーション後に確認すべき項目：

- [ ] `langfuse_traces` テーブルが作成されている
- [ ] `langfuse_scores` テーブルが作成されている
- [ ] `langfuse_batch_runs` テーブルが作成されている
- [ ] `rate_limit_logs` テーブルが作成されている
- [ ] 既存テーブルに `langfuse_trace_id` カラムが追加されている
- [ ] RLSポリシーが正しく設定されている
- [ ] インデックスが作成されている
- [ ] 外部キー制約が正しく設定されている
