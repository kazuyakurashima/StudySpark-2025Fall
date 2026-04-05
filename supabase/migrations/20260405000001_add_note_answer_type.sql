-- ============================================================================
-- answer_type に 'note' を追加（解説参照 — 入力不要の表示専用設問）
-- ============================================================================
-- 目的: 解説参照問題（入力なし・採点なし）をDBに保存できるようにする
-- 影響: questions テーブルの CHECK 制約 2 本を修正
-- 既存データ: なし（新制約は既存値をすべて受け入れる）
-- 冪等性: IF NOT EXISTS / IF EXISTS で何度実行しても安全
-- ロールバック: questions_answer_type_check を元の4値に戻し、
--              questions_answer_integrity_check を元の2条件に戻す
-- ============================================================================

BEGIN;

-- 1. answer_type 列レベル CHECK を削除（旧名・新名どちらでも DROP）
--    初回: 自動生成名（questions_answer_type_check1 など）を動的取得して削除
--    再実行: 固定名 questions_answer_type_check を IF EXISTS で削除
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- 既存の answer_type IN (...) 制約を名前問わず削除
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%answer_type IN%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- 2. 整合性 CHECK（correct_answer / answer_config 必須）を削除
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%correct_answer IS NOT NULL%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- 3. answer_type 制約を再追加（'note' を含む、IF NOT EXISTS で冪等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.questions'::regclass
      AND conname = 'questions_answer_type_check'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_answer_type_check
      CHECK (answer_type IN ('numeric', 'fraction', 'multi_part', 'selection', 'note'));
  END IF;
END $$;

-- 4. 整合性制約を再追加（'note' は correct_answer も answer_config も不要、IF NOT EXISTS で冪等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.questions'::regclass
      AND conname = 'questions_answer_integrity_check'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_answer_integrity_check
      CHECK (
        (answer_type IN ('numeric', 'fraction') AND correct_answer IS NOT NULL)
        OR
        (answer_type IN ('multi_part', 'selection') AND answer_config IS NOT NULL)
        OR
        (answer_type = 'note')
      );
  END IF;
END $$;

COMMIT;
