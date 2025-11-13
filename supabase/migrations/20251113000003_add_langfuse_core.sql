-- Langfuseコアテーブルの作成
-- Phase 1 Day 5: マイグレーション1

-- 1. langfuse_traces テーブル (メインテーブル)
CREATE TABLE langfuse_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('coaching_message', 'encouragement_message', 'weekly_analysis')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_langfuse_traces_entity ON langfuse_traces(entity_type, entity_id);
CREATE INDEX idx_langfuse_traces_user_id ON langfuse_traces(user_id);
CREATE INDEX idx_langfuse_traces_created_at ON langfuse_traces(created_at);

COMMENT ON TABLE langfuse_traces IS 'Langfuseトレース記録（AI生成のログ）';
COMMENT ON COLUMN langfuse_traces.trace_id IS 'Langfuse側のトレースID（UUID）';
COMMENT ON COLUMN langfuse_traces.entity_type IS 'エンティティタイプ（どのAI機能か）';
COMMENT ON COLUMN langfuse_traces.entity_id IS 'エンティティID（ai_coach_messagesのid等）';
COMMENT ON COLUMN langfuse_traces.metadata IS 'メタデータ（キャッシュヒット情報など）';
COMMENT ON COLUMN langfuse_traces.tags IS 'タグ（週のタイプなど）';

-- 2. langfuse_scores テーブル (スコア記録)
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

-- インデックス作成
CREATE INDEX idx_langfuse_scores_trace_id ON langfuse_scores(trace_id);
CREATE INDEX idx_langfuse_scores_status ON langfuse_scores(status);
CREATE INDEX idx_langfuse_scores_created_at ON langfuse_scores(created_at);

COMMENT ON TABLE langfuse_scores IS 'Langfuseスコア記録（フィードバック・評価）';
COMMENT ON COLUMN langfuse_scores.score_name IS 'スコア名（user_feedback, mission_completed等）';
COMMENT ON COLUMN langfuse_scores.value IS 'スコア値（0 or 1）';
COMMENT ON COLUMN langfuse_scores.status IS 'ステータス（pending: 未送信, sent: 送信済み, failed: 失敗）';
COMMENT ON COLUMN langfuse_scores.sent_at IS 'Langfuseへの送信日時';

-- 3. langfuse_batch_runs テーブル (バッチ実行履歴)
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

-- インデックス作成
CREATE INDEX idx_langfuse_batch_runs_batch_name ON langfuse_batch_runs(batch_name);
CREATE INDEX idx_langfuse_batch_runs_created_at ON langfuse_batch_runs(created_at);

COMMENT ON TABLE langfuse_batch_runs IS 'Langfuseバッチ実行履歴';
COMMENT ON COLUMN langfuse_batch_runs.batch_name IS 'バッチ名（mission_completed, next_day_activity等）';
COMMENT ON COLUMN langfuse_batch_runs.scores_created IS '作成されたスコア数';
COMMENT ON COLUMN langfuse_batch_runs.scores_sent IS 'Langfuseに送信されたスコア数';
COMMENT ON COLUMN langfuse_batch_runs.errors IS 'エラー情報（JSON配列）';

-- 4. rate_limit_logs テーブル (レート制限ログ)
CREATE TABLE rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ユニークインデックス（同一ユーザー・エンドポイント・時間窓での重複防止）
CREATE UNIQUE INDEX idx_rate_limit_logs_unique ON rate_limit_logs(user_id, endpoint, window_start);
CREATE INDEX idx_rate_limit_logs_user_id ON rate_limit_logs(user_id);

COMMENT ON TABLE rate_limit_logs IS 'レート制限ログ（API呼び出し回数追跡）';
COMMENT ON COLUMN rate_limit_logs.endpoint IS 'エンドポイント名（/api/langfuse/score等）';
COMMENT ON COLUMN rate_limit_logs.window_start IS '時間窓の開始時刻';
COMMENT ON COLUMN rate_limit_logs.request_count IS 'リクエスト回数';
