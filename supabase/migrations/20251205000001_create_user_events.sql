-- ============================================================================
-- user_events テーブル作成（モチベーション機能計測基盤）
-- ============================================================================
-- 作成日: 2025-12-05
-- 説明: Phase 0 イベント計測用テーブル
-- 参照: docs/MOTIVATION_FEATURE_IMPLEMENTATION_PLAN.md

-- user_events テーブル（イベント計測用）
CREATE TABLE IF NOT EXISTS user_events (
  id BIGSERIAL PRIMARY KEY,

  -- ユーザー識別（必須）
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 生徒識別（生徒イベントの場合。保護者イベントはNULL）
  student_id INT REFERENCES students(id) ON DELETE SET NULL,

  -- ロール（'student' | 'parent' | 'coach' | 'system'）
  user_role VARCHAR(20) NOT NULL,

  -- イベント情報
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Langfuseトレース紐付け（AI生成イベントの場合）
  langfuse_trace_id VARCHAR(100),

  -- 生成コンテンツID（褒めヒント等のDB保存時）
  content_id BIGINT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- コメント
COMMENT ON TABLE user_events IS 'ユーザー行動イベント計測テーブル（モチベーション機能効果測定用）';
COMMENT ON COLUMN user_events.user_id IS 'auth.usersのUUID';
COMMENT ON COLUMN user_events.student_id IS '生徒イベントの場合のstudent_id（保護者イベントはNULL）';
COMMENT ON COLUMN user_events.user_role IS 'イベント発火者のロール: student, parent, coach, system';
COMMENT ON COLUMN user_events.event_type IS 'イベント種別（streak_card_view, streak_reset等）';
COMMENT ON COLUMN user_events.event_data IS 'イベント固有のデータ（JSONB）';
COMMENT ON COLUMN user_events.langfuse_trace_id IS 'AI生成イベント時のLangfuseトレースID';
COMMENT ON COLUMN user_events.content_id IS '関連コンテンツのID（褒めヒント等）';

-- インデックス
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_student_id ON user_events(student_id);
CREATE INDEX idx_user_events_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at);
CREATE INDEX idx_user_events_langfuse ON user_events(langfuse_trace_id) WHERE langfuse_trace_id IS NOT NULL;
CREATE INDEX idx_user_events_content_id ON user_events(content_id) WHERE content_id IS NOT NULL;

-- RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- アクセスパターン:
-- 1. 書き込み: Server Actions / API Routes から service_role で実行
-- 2. 読み取り: 管理者ダッシュボードのみ（一般ユーザーは直接参照しない）

-- service_role: 全操作可能
CREATE POLICY "Service role full access"
  ON user_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 一般ユーザー: アクセス不可（Server Actions経由でのみ書き込み）
-- フロントエンドのanonキーではアクセスできない設計
