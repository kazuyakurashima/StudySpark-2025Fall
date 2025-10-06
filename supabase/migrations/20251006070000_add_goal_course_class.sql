-- ============================================================================
-- P3-1: ゴールナビ用にtest_goalsテーブルを拡張
-- ============================================================================
-- 作成日: 2025-10-06 07:00
-- 説明: コース・組の目標設定をサポート

-- test_goalsテーブルにカラム追加
ALTER TABLE public.test_goals
  ADD COLUMN IF NOT EXISTS target_course VARCHAR(1) CHECK (target_course IN ('S', 'C', 'B', 'A')),
  ADD COLUMN IF NOT EXISTS target_class SMALLINT CHECK (target_class >= 1 AND target_class <= 40),
  ADD COLUMN IF NOT EXISTS goal_thoughts TEXT;

-- commitment_textをgoal_thoughtsとして使用する場合の移行
-- （既存データがあればコピー）
UPDATE public.test_goals
SET goal_thoughts = commitment_text
WHERE goal_thoughts IS NULL AND commitment_text IS NOT NULL;

COMMENT ON COLUMN public.test_goals.target_course IS '目標コース（S/C/B/A）';
COMMENT ON COLUMN public.test_goals.target_class IS '目標の組（1〜40）';
COMMENT ON COLUMN public.test_goals.goal_thoughts IS 'AI対話から生成された「今回の思い」';
