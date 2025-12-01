-- ============================================================================
-- coach_feedbacks: スパーク機能のコーチフィードバック
-- ============================================================================
-- 作成日: 2025-12-01
-- 説明: 学習記録保存時にAIコーチが生成する励ましフィードバックを保存
--       生徒・保護者・指導者で共有し、セルフコンパッションを促進

-- ----------------------------------------------------------------------------
-- テーブル作成
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_feedbacks (
  id BIGSERIAL PRIMARY KEY,
  study_log_id BIGINT NOT NULL REFERENCES public.study_logs(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT,
  langfuse_trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1学習記録に1フィードバック
  CONSTRAINT unique_feedback_per_log UNIQUE (study_log_id)
);

-- ----------------------------------------------------------------------------
-- インデックス
-- ----------------------------------------------------------------------------
CREATE INDEX idx_coach_feedbacks_student_id ON public.coach_feedbacks(student_id);
CREATE INDEX idx_coach_feedbacks_session_id ON public.coach_feedbacks(session_id);
CREATE INDEX idx_coach_feedbacks_study_log_id ON public.coach_feedbacks(study_log_id);

-- ----------------------------------------------------------------------------
-- RLS有効化
-- ----------------------------------------------------------------------------
ALTER TABLE public.coach_feedbacks ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLSポリシー（SELECT専用）
-- INSERT/UPDATE/DELETEはServer Action経由でサービスロールが実行
-- ----------------------------------------------------------------------------

-- 生徒: 自分のフィードバック閲覧のみ
CREATE POLICY "Students can SELECT own feedbacks" ON public.coach_feedbacks
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- 保護者: 子供のフィードバック閲覧のみ
CREATE POLICY "Parents can SELECT children feedbacks" ON public.coach_feedbacks
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM public.parent_child_relations
      WHERE parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid())
    )
  );

-- 指導者: 担当生徒のフィードバック閲覧のみ
CREATE POLICY "Coaches can SELECT assigned student feedbacks" ON public.coach_feedbacks
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM public.coach_student_relations
      WHERE coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())
    )
  );

-- 管理者: 全閲覧
CREATE POLICY "Admins can SELECT all feedbacks" ON public.coach_feedbacks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- コメント
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.coach_feedbacks IS 'スパーク機能のコーチフィードバック。INSERT/UPDATE/DELETEはServer Action経由でサービスロールが実行';
COMMENT ON COLUMN public.coach_feedbacks.study_log_id IS '関連する学習ログID';
COMMENT ON COLUMN public.coach_feedbacks.student_id IS '生徒ID（高速検索用に非正規化）';
COMMENT ON COLUMN public.coach_feedbacks.session_id IS 'セッションID（高速検索用に非正規化）';
COMMENT ON COLUMN public.coach_feedbacks.feedback_text IS 'AIコーチが生成したフィードバック本文';
COMMENT ON COLUMN public.coach_feedbacks.prompt_version IS 'プロンプトバージョン（効果測定用）';
COMMENT ON COLUMN public.coach_feedbacks.prompt_hash IS 'プロンプトハッシュ（監査用）';
COMMENT ON COLUMN public.coach_feedbacks.langfuse_trace_id IS 'Langfuseトレース連携用ID';
