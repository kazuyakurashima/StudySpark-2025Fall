-- ============================================================================
-- lock_answer_session にオプショナルなステータス検証パラメータを追加
-- ============================================================================
-- 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md
-- 目的: 排他制御の行ロック時にステータスも同時に検証し、
--        無効なステータスのセッションに対する操作を防止する
-- 既存互換: p_expected_status は NULL 許容。NULL の場合は従来通りステータス不問
-- 既存データへの影響: なし（関数の置き換えのみ）

CREATE OR REPLACE FUNCTION public.lock_answer_session(
  p_session_id BIGINT,
  p_student_id BIGINT,
  p_expected_status VARCHAR DEFAULT NULL
)
RETURNS public.answer_sessions AS $$
  SELECT *
  FROM public.answer_sessions
  WHERE id = p_session_id
    AND student_id = p_student_id
    AND (p_expected_status IS NULL OR status = p_expected_status)
  FOR UPDATE
$$ LANGUAGE sql;

COMMENT ON FUNCTION public.lock_answer_session IS '排他制御: 行ロック + 所有者チェック + オプショナルステータス検証（Server Actions 用）';
