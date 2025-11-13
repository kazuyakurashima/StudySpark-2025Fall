-- LangfuseテーブルへのRLSポリシー設定
-- Phase 1 Day 5: マイグレーション3

-- ============================================================
-- langfuse_traces の RLS 設定
-- ============================================================

ALTER TABLE langfuse_traces ENABLE ROW LEVEL SECURITY;

-- 自分のトレースのみ閲覧可能
CREATE POLICY "Users can view their own traces"
ON langfuse_traces FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own traces" ON langfuse_traces IS
'ユーザーは自分のトレースのみ閲覧可能';

-- ============================================================
-- langfuse_scores の RLS 設定
-- ============================================================

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

COMMENT ON POLICY "Users can view scores for their traces" ON langfuse_scores IS
'ユーザーは自分のトレースに紐づくスコアのみ閲覧可能';

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

COMMENT ON POLICY "Users can insert scores for their traces" ON langfuse_scores IS
'ユーザーは自分のトレースにスコアを追加可能';

-- ============================================================
-- langfuse_batch_runs の RLS 設定
-- ============================================================

ALTER TABLE langfuse_batch_runs ENABLE ROW LEVEL SECURITY;

-- バッチ実行履歴は管理者のみ閲覧可能（将来の拡張用）
-- 現時点ではポリシーなし（サービスロールのみアクセス）

COMMENT ON TABLE langfuse_batch_runs IS
'RLS有効化済み。現時点ではサービスロールのみアクセス可能。';

-- ============================================================
-- rate_limit_logs の RLS 設定
-- ============================================================

ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- 自分のレート制限ログのみ閲覧可能
CREATE POLICY "Users can view their own rate limit logs"
ON rate_limit_logs FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own rate limit logs" ON rate_limit_logs IS
'ユーザーは自分のレート制限ログのみ閲覧可能';
