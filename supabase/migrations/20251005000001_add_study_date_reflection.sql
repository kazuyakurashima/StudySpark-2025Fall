-- ============================================================================
-- study_logs テーブルに study_date と reflection_text を追加
-- ============================================================================
-- 作成日: 2025-10-05
-- 説明: P1-1 学習記録保存機能の要件に対応
--       - study_date: 学習日 (デフォルトは今日)
--       - reflection_text: 振り返りコメント
--       - UNIQUE制約を (student_id, session_id, subject_id, study_content_type_id, study_date) に変更

-- ----------------------------------------------------------------------------
-- 1. 既存のUNIQUE制約を削除
-- ----------------------------------------------------------------------------
-- PostgreSQLは識別子を63文字に切り詰めるため、実際の制約名はこちら
ALTER TABLE public.study_logs
  DROP CONSTRAINT IF EXISTS study_logs_student_id_session_id_subject_id_study_content_t_key;

-- ----------------------------------------------------------------------------
-- 2. study_date カラムを追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.study_logs
  ADD COLUMN IF NOT EXISTS study_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- ----------------------------------------------------------------------------
-- 3. reflection_text カラムを追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.study_logs
  ADD COLUMN IF NOT EXISTS reflection_text TEXT;

-- ----------------------------------------------------------------------------
-- 4. 新しいUNIQUE制約を追加 (study_date を含む)
-- ----------------------------------------------------------------------------
-- 同じ生徒×学習回×科目×学習内容×学習日の組み合わせは一意
ALTER TABLE public.study_logs
  ADD CONSTRAINT study_logs_unique_per_date
    UNIQUE (student_id, session_id, subject_id, study_content_type_id, study_date);

-- ----------------------------------------------------------------------------
-- 5. study_date 用のインデックスを追加
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_study_logs_study_date ON public.study_logs(study_date DESC);

-- ----------------------------------------------------------------------------
-- コメント更新
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.study_logs.study_date IS '学習日 (YYYY-MM-DD形式)';
COMMENT ON COLUMN public.study_logs.reflection_text IS '振り返りコメント (オプション)';
