-- ============================================================================
-- answer_type に 'note' を追加（解説参照 — 入力不要の表示専用設問）
-- ============================================================================
-- 目的: 解説参照問題（入力なし・採点なし）をDBに保存できるようにする
-- 影響: questions テーブルの CHECK 制約 2 本を修正
-- 既存データ: なし（新制約は既存値をすべて受け入れる）
-- ロールバック: 逆順で DROP / ADD を再実行
-- ============================================================================

-- 1. answer_type 列レベル CHECK の名前を動的に取得して削除
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%answer_type IN%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- 2. 整合性 CHECK（correct_answer / answer_config 必須）の名前を動的に取得して削除
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

-- 3. answer_type 制約を再追加（'note' を含む）
ALTER TABLE public.questions
  ADD CONSTRAINT questions_answer_type_check
  CHECK (answer_type IN ('numeric', 'fraction', 'multi_part', 'selection', 'note'));

-- 4. 整合性制約を再追加（'note' は correct_answer も answer_config も不要）
ALTER TABLE public.questions
  ADD CONSTRAINT questions_answer_integrity_check
  CHECK (
    (answer_type IN ('numeric', 'fraction') AND correct_answer IS NOT NULL)
    OR
    (answer_type IN ('multi_part', 'selection') AND answer_config IS NOT NULL)
    OR
    (answer_type = 'note')
  );
