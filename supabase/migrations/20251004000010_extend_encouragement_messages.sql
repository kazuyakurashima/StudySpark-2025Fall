-- ============================================================================
-- 10: encouragement_messages テーブル拡張
-- ============================================================================
-- 作成日: 2025-10-06
-- 説明: 応援メッセージに応援種別と学習ログ参照カラムを追加
-- 対応タスク: P0-3 応援ログスキーマ拡張

-- ----------------------------------------------------------------------------
-- カラム追加
-- ----------------------------------------------------------------------------

-- 応援種別カラム追加 (quick: クイック応援, ai: AI応援, custom: カスタム応援)
ALTER TABLE public.encouragement_messages
ADD COLUMN IF NOT EXISTS support_type VARCHAR(20) CHECK (support_type IN ('quick', 'ai', 'custom'));

-- 学習ログ参照カラム追加 (応援対象の学習ログとの紐付け)
ALTER TABLE public.encouragement_messages
ADD COLUMN IF NOT EXISTS related_study_log_id BIGINT REFERENCES public.study_logs(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- インデックス追加
-- ----------------------------------------------------------------------------

-- 応援種別でのフィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_encouragement_support_type
  ON public.encouragement_messages(support_type);

-- 学習ログ参照用インデックス
CREATE INDEX IF NOT EXISTS idx_encouragement_study_log
  ON public.encouragement_messages(related_study_log_id);

-- 科目フィルター高速化用の複合インデックス (student_id + related_study_log_id)
CREATE INDEX IF NOT EXISTS idx_encouragement_student_log
  ON public.encouragement_messages(student_id, related_study_log_id);

-- ----------------------------------------------------------------------------
-- コメント追加
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.encouragement_messages.support_type IS '応援種別: quick(クイック応援), ai(AI応援), custom(カスタム応援)';
COMMENT ON COLUMN public.encouragement_messages.related_study_log_id IS '応援対象の学習ログID (科目フィルター用)';

-- ----------------------------------------------------------------------------
-- 既存データへのデフォルト値設定（マイグレーション実行時のみ）
-- ----------------------------------------------------------------------------

-- 既存レコードには 'custom' をデフォルト設定
UPDATE public.encouragement_messages
SET support_type = 'custom'
WHERE support_type IS NULL;

-- 今後は support_type を必須化
ALTER TABLE public.encouragement_messages
ALTER COLUMN support_type SET NOT NULL;
