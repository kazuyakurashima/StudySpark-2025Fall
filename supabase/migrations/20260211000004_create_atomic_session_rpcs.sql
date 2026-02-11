-- ============================================================================
-- reveal_math_answers / begin_math_retry: アトミック UPDATE RPC
-- ============================================================================
-- 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md Section 5-4
-- 目的: 正答開示 ↔ リトライ開始 の競合を PostgreSQL 行レベルロックで防止
-- 背景: lock_answer_session (SELECT ... FOR UPDATE) はRPC単位でロック解放されるため、
--        後続の UPDATE は別トランザクションとなり排他制御が成立しない。
--        単一 UPDATE 文にすることで、チェック＋更新がアトミックに完結する。
-- 既存データへの影響: なし（新規関数追加のみ）

-- ============================================================================
-- reveal_math_answers: 正答開示のアトミック更新
-- ============================================================================
-- WHERE 条件: status='graded' AND is_latest=true
--   → リトライ開始（begin_math_retry）が先に is_latest=false にした場合、
--     この UPDATE は 0行 にマッチし、開示を防止する。
-- 冪等性: answers_revealed が既に true でも UPDATE はマッチし、行を返す。
CREATE OR REPLACE FUNCTION public.reveal_math_answers(
  p_session_id BIGINT,
  p_student_id BIGINT
) RETURNS public.answer_sessions AS $$
  UPDATE public.answer_sessions
  SET answers_revealed = true
  WHERE id = p_session_id
    AND student_id = p_student_id
    AND status = 'graded'
    AND is_latest = true
  RETURNING *;
$$ LANGUAGE sql VOLATILE;

COMMENT ON FUNCTION public.reveal_math_answers IS '正答開示のアトミック更新（graded + is_latest検証、リトライとの競合防止）';

-- service_role のみ実行可能（Server Actions 経由）
REVOKE EXECUTE ON FUNCTION public.reveal_math_answers(BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_math_answers(BIGINT, BIGINT) TO service_role;

-- ============================================================================
-- begin_math_retry: リトライ開始のアトミック更新
-- ============================================================================
-- WHERE 条件: status='graded' AND answers_revealed=false AND is_latest=true
--   → 正答開示（reveal_math_answers）が先に answers_revealed=true にした場合、
--     この UPDATE は 0行 にマッチし、リトライ開始を防止する。
-- 戻り値: 更新後の行（is_latest=false）。question_set_id, attempt_number を後続処理で使用。
CREATE OR REPLACE FUNCTION public.begin_math_retry(
  p_session_id BIGINT,
  p_student_id BIGINT
) RETURNS public.answer_sessions AS $$
  UPDATE public.answer_sessions
  SET is_latest = false
  WHERE id = p_session_id
    AND student_id = p_student_id
    AND status = 'graded'
    AND answers_revealed = false
    AND is_latest = true
  RETURNING *;
$$ LANGUAGE sql VOLATILE;

COMMENT ON FUNCTION public.begin_math_retry IS 'リトライ開始のアトミック更新（graded + 未開示 + is_latest検証、正答開示との競合防止）';

-- service_role のみ実行可能（Server Actions 経由）
REVOKE EXECUTE ON FUNCTION public.begin_math_retry(BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_math_retry(BIGINT, BIGINT) TO service_role;
