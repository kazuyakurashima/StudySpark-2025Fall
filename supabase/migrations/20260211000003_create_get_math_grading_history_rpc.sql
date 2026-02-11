-- ============================================================================
-- getMathGradingHistory 用 CTE 集約 RPC 関数
-- ============================================================================
-- 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md Section 12
-- 目的: N+1 回避のため、セット一覧 + 最新セッション + アテンプト履歴を 1クエリで取得
-- 許容クエリ数: getMathGradingHistory() 全体で最大2（resolveStudentId + この RPC）
-- 既存データへの影響: なし（新規関数追加のみ）

CREATE OR REPLACE FUNCTION public.get_math_grading_history(
  p_student_id BIGINT
)
RETURNS TABLE (
  question_set_id  BIGINT,
  title            VARCHAR(255),
  session_number   SMALLINT,
  display_order    SMALLINT,
  question_count   BIGINT,
  -- 最新セッション
  latest_session_id       BIGINT,
  latest_attempt_number   SMALLINT,
  latest_status           VARCHAR(20),
  latest_total_score      SMALLINT,
  latest_max_score        SMALLINT,
  latest_answers_revealed BOOLEAN,
  latest_completed_at     TIMESTAMPTZ,
  -- アテンプト履歴 (JSON配列)
  attempt_history         JSON
) AS $$
  WITH target_sets AS (
    SELECT qs.id, qs.title, qs.display_order,
           ss.session_number
    FROM public.question_sets qs
    JOIN public.study_sessions ss ON ss.id = qs.session_id
    WHERE qs.subject_id = 1  -- 算数
      AND qs.status = 'approved'
      AND qs.grade = (SELECT s.grade FROM public.students s WHERE s.id = p_student_id)
  ),
  question_counts AS (
    SELECT q.question_set_id, COUNT(*) AS cnt
    FROM public.questions q
    WHERE q.question_set_id IN (SELECT id FROM target_sets)
    GROUP BY q.question_set_id
  ),
  latest_sessions AS (
    SELECT ase.*
    FROM public.answer_sessions ase
    WHERE ase.student_id = p_student_id
      AND ase.is_latest = true
      AND ase.question_set_id IN (SELECT id FROM target_sets)
  ),
  graded_history AS (
    SELECT
      ase.question_set_id,
      json_agg(
        json_build_object(
          'attempt', ase.attempt_number,
          'score', ase.total_score,
          'maxScore', ase.max_score,
          'percentage', CASE WHEN ase.max_score > 0
            THEN ROUND(ase.total_score::NUMERIC / ase.max_score * 100)
            ELSE 0 END,
          'gradedAt', ase.completed_at
        ) ORDER BY ase.attempt_number
      ) AS history
    FROM public.answer_sessions ase
    WHERE ase.student_id = p_student_id
      AND ase.status = 'graded'
      AND ase.question_set_id IN (SELECT id FROM target_sets)
    GROUP BY ase.question_set_id
  )
  SELECT
    ts.id AS question_set_id,
    ts.title,
    ts.session_number,
    ts.display_order,
    COALESCE(qc.cnt, 0) AS question_count,
    ls.id AS latest_session_id,
    ls.attempt_number AS latest_attempt_number,
    ls.status AS latest_status,
    ls.total_score AS latest_total_score,
    ls.max_score AS latest_max_score,
    ls.answers_revealed AS latest_answers_revealed,
    ls.completed_at AS latest_completed_at,
    COALESCE(gh.history, '[]'::json) AS attempt_history
  FROM target_sets ts
  LEFT JOIN question_counts qc ON qc.question_set_id = ts.id
  LEFT JOIN latest_sessions ls ON ls.question_set_id = ts.id
  LEFT JOIN graded_history gh ON gh.question_set_id = ts.id
  ORDER BY ts.session_number, ts.display_order;
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.get_math_grading_history IS '算数自動採点の全履歴を1クエリで取得（CTE集約、Section 12準拠）';

-- アクセス制限: SECURITY DEFINER のため PUBLIC からの直接呼び出しを禁止
-- Server Actions は createAdminClient()（service_role）経由で呼び出すため、
-- service_role のみに EXECUTE を許可。authenticated からの直接呼び出しを遮断し、
-- 任意の p_student_id 指定によるデータ漏えいを防止する。
REVOKE EXECUTE ON FUNCTION public.get_math_grading_history(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_math_grading_history(BIGINT) TO service_role;
