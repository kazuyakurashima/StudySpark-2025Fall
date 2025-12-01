-- ============================================================================
-- batch_id: 同時保存グループID
-- ============================================================================
-- 作成日: 2025-12-01
-- 説明: 複数科目を同時に保存した場合に1つのフィードバックを紐付けるためのグループID
--       1回の保存 = 1つの総合フィードバック を実現する

-- ----------------------------------------------------------------------------
-- study_logs に batch_id 追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.study_logs ADD COLUMN IF NOT EXISTS batch_id UUID;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_study_logs_batch_id ON public.study_logs(batch_id);

COMMENT ON COLUMN public.study_logs.batch_id IS '同時保存グループID（UUID）。同時に保存された複数ログを紐付ける';

-- ----------------------------------------------------------------------------
-- coach_feedbacks に batch_id 追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.coach_feedbacks ADD COLUMN IF NOT EXISTS batch_id UUID;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_coach_feedbacks_batch_id ON public.coach_feedbacks(batch_id);

COMMENT ON COLUMN public.coach_feedbacks.batch_id IS '同時保存グループID（UUID）。batch単位で1フィードバック';

-- ----------------------------------------------------------------------------
-- 既存制約を削除し、新しい制約を追加
-- ----------------------------------------------------------------------------

-- 既存の unique_feedback_per_log 制約を削除（存在する場合）
ALTER TABLE public.coach_feedbacks DROP CONSTRAINT IF EXISTS unique_feedback_per_log;

-- 新規制約: batch_id 単位で1フィードバック（batch_id が NOT NULL の場合）
CREATE UNIQUE INDEX IF NOT EXISTS unique_feedback_per_batch
  ON public.coach_feedbacks(batch_id) WHERE batch_id IS NOT NULL;

-- レガシー制約: batch_id=NULL の場合は study_log_id 単位（既存データ互換）
CREATE UNIQUE INDEX IF NOT EXISTS unique_feedback_per_log_legacy
  ON public.coach_feedbacks(study_log_id) WHERE batch_id IS NULL;

-- ----------------------------------------------------------------------------
-- 注意事項
-- ----------------------------------------------------------------------------
-- study_log_id は NOT NULL のまま維持（レガシー互換性のため）
-- 新規データでも代表の1件を study_log_id に設定する方式
