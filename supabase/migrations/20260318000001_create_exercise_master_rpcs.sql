-- ============================================================================
-- 演習問題集 指導者閲覧機能: RPC 2件
-- ============================================================================
-- 計画書: docs/exercise-coach-parent-view-plan.md
-- 概要:
--   1. get_exercise_master_summary — セッション一覧+平均正答率
--   2. get_exercise_master_detail  — 生徒×問題 正誤マトリクス+セクション統計
--
-- 設計方針:
--   - auth.uid() から内部でロール解決（p_coach_id パラメータ不要、なりすまし防止）
--   - avg_rate は未提出生徒を除外した提出済み生徒のみの算術平均
--   - マスタープリント RPC (20260216000001) と同構造の CTE パターンを流用
--   - exercise_workbook のみ対象（set_type = 'exercise_workbook'）
-- ============================================================================

-- ============================================================
-- 1. get_exercise_master_summary RPC
-- ============================================================
-- 指導者/admin が演習問題集のセッション別サマリーを取得
-- coach: 担当生徒のみ、admin: 該当学年の全生徒

CREATE OR REPLACE FUNCTION public.get_exercise_master_summary(p_grade SMALLINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_coach_id BIGINT;
  v_result JSONB;
BEGIN
  -- 認証チェック
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  -- ロール検証
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: role=% is not allowed', COALESCE(v_role, 'none');
  END IF;

  -- coach の場合は coach_id を解決
  IF v_role = 'coach' THEN
    SELECT id INTO v_coach_id FROM coaches WHERE user_id = v_user_id;
    IF v_coach_id IS NULL THEN
      RAISE EXCEPTION 'Coach record not found for user %', v_user_id;
    END IF;
  END IF;

  -- 学年バリデーション
  IF p_grade NOT IN (5, 6) THEN
    RAISE EXCEPTION 'Invalid grade: %. Must be 5 or 6.', p_grade;
  END IF;

  -- 集計クエリ
  WITH target_students AS (
    SELECT s.id AS student_id
    FROM students s
    WHERE s.grade = p_grade
      AND s.graduated_at IS NULL
      AND (
        v_role = 'admin'
        OR EXISTS (
          SELECT 1 FROM coach_student_relations csr
          WHERE csr.coach_id = v_coach_id AND csr.student_id = s.id
        )
      )
  ),
  total_student_count AS (
    SELECT COUNT(*) AS cnt FROM target_students
  ),
  -- 演習問題集の全セッション一覧
  exercise_sets AS (
    SELECT
      qs.id AS question_set_id,
      qs.title,
      qs.grade,
      ss.session_number,
      COUNT(q.id) AS total_questions
    FROM question_sets qs
    JOIN study_sessions ss ON ss.id = qs.session_id
    LEFT JOIN questions q ON q.question_set_id = qs.id
    WHERE qs.set_type = 'exercise_workbook'
      AND qs.status = 'approved'
      AND qs.grade = p_grade
      AND qs.edition IS NULL
    GROUP BY qs.id, qs.title, qs.grade, ss.session_number
  ),
  -- 提出済みセッション集計
  -- avg_rate: 未提出除外。提出済み生徒の正答率の算術平均
  session_stats AS (
    SELECT
      ase.question_set_id,
      COUNT(*) AS submitted_count,
      -- 各生徒の正答率を算出してから平均
      ROUND(AVG(
        CASE WHEN ase.max_score > 0
          THEN ase.total_score::NUMERIC / ase.max_score
          ELSE 0
        END
      ), 3) AS avg_rate
    FROM answer_sessions ase
    WHERE ase.is_latest = true
      AND ase.status = 'graded'
      AND ase.student_id IN (SELECT student_id FROM target_students)
      AND ase.question_set_id IN (SELECT question_set_id FROM exercise_sets)
    GROUP BY ase.question_set_id
  )
  SELECT jsonb_build_object(
    'grade', p_grade,
    'total_students', (SELECT cnt FROM total_student_count),
    'sessions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_number', es.session_number,
          'title', es.title,
          'question_set_id', es.question_set_id,
          'total_questions', es.total_questions,
          'submitted_count', COALESCE(ss.submitted_count, 0),
          'total_students', (SELECT cnt FROM total_student_count),
          'avg_rate', COALESCE(ss.avg_rate, 0)
        ) ORDER BY es.session_number
      )
      FROM exercise_sets es
      LEFT JOIN session_stats ss ON ss.question_set_id = es.question_set_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_exercise_master_summary IS '演習問題集のセッション別サマリー（指導者/admin用）';

REVOKE ALL ON FUNCTION public.get_exercise_master_summary(SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exercise_master_summary(SMALLINT) TO authenticated;

-- ============================================================
-- 2. get_exercise_master_detail RPC
-- ============================================================
-- 指定した演習問題集の全設問 × 担当全生徒の正誤マトリクス + セクション統計

CREATE OR REPLACE FUNCTION public.get_exercise_master_detail(p_question_set_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_coach_id BIGINT;
  v_qs_grade SMALLINT;
  v_result JSONB;
BEGIN
  -- 認証チェック
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  -- ロール検証
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: role=% is not allowed', COALESCE(v_role, 'none');
  END IF;

  IF v_role = 'coach' THEN
    SELECT id INTO v_coach_id FROM coaches WHERE user_id = v_user_id;
    IF v_coach_id IS NULL THEN
      RAISE EXCEPTION 'Coach record not found for user %', v_user_id;
    END IF;
  END IF;

  -- question_set の存在・権限チェック（exercise_workbook のみ）
  SELECT grade INTO v_qs_grade
  FROM question_sets
  WHERE id = p_question_set_id
    AND set_type = 'exercise_workbook'
    AND status = 'approved';
  IF v_qs_grade IS NULL THEN
    RAISE EXCEPTION 'Question set not found or not an approved exercise workbook: %', p_question_set_id;
  END IF;

  WITH target_students AS (
    SELECT s.id AS student_id, s.full_name, s.login_id, s.course AS course_level
    FROM students s
    WHERE s.grade = v_qs_grade
      AND s.graduated_at IS NULL
      AND (
        v_role = 'admin'
        OR EXISTS (
          SELECT 1 FROM coach_student_relations csr
          WHERE csr.coach_id = v_coach_id AND csr.student_id = s.id
        )
      )
  ),
  qs_info AS (
    SELECT qs.id, qs.title, qs.grade,
           ss.session_number
    FROM question_sets qs
    JOIN study_sessions ss ON ss.id = qs.session_id
    WHERE qs.id = p_question_set_id
  ),
  all_questions AS (
    SELECT q.id, q.question_number, q.section_name, q.min_course,
           q.points, q.display_order
    FROM questions q
    WHERE q.question_set_id = p_question_set_id
    ORDER BY q.display_order
  ),
  student_sessions AS (
    SELECT ase.student_id, ase.id AS session_id,
           ase.total_score, ase.max_score
    FROM answer_sessions ase
    WHERE ase.question_set_id = p_question_set_id
      AND ase.is_latest = true
      AND ase.status = 'graded'
      AND ase.student_id IN (SELECT student_id FROM target_students)
  ),
  student_results AS (
    SELECT
      ts.student_id,
      ts.full_name,
      ts.login_id,
      ts.course_level,
      ss.total_score,
      ss.max_score,
      CASE WHEN ss.max_score IS NOT NULL AND ss.max_score > 0
        THEN ROUND(ss.total_score::NUMERIC / ss.max_score, 3)
        ELSE NULL
      END AS accuracy_rate,
      CASE WHEN ss.session_id IS NOT NULL THEN
        (SELECT jsonb_object_agg(
          sa.question_id::TEXT,
          sa.is_correct
        )
        FROM student_answers sa
        WHERE sa.answer_session_id = ss.session_id)
      ELSE NULL
      END AS results
    FROM target_students ts
    LEFT JOIN student_sessions ss ON ss.student_id = ts.student_id
  ),
  -- 設問別正解率
  question_stats AS (
    SELECT
      sa.question_id,
      COUNT(*) FILTER (WHERE sa.is_correct = true) AS correct_count,
      COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL) AS answered_count,
      CASE
        WHEN COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE sa.is_correct = true)::NUMERIC /
          COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL),
          3
        )
        ELSE 0
      END AS rate
    FROM student_answers sa
    JOIN answer_sessions ase ON ase.id = sa.answer_session_id
    WHERE ase.question_set_id = p_question_set_id
      AND ase.is_latest = true
      AND ase.status = 'graded'
      AND ase.student_id IN (SELECT student_id FROM target_students)
    GROUP BY sa.question_id
  ),
  -- セクション別正解率（ステップ①②③）
  section_stats AS (
    SELECT
      q.section_name,
      COUNT(DISTINCT q.id) AS question_count,
      COUNT(*) FILTER (WHERE sa.is_correct = true) AS correct_count,
      COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL) AS answered_count,
      CASE
        WHEN COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE sa.is_correct = true)::NUMERIC /
          COUNT(*) FILTER (WHERE sa.is_correct IS NOT NULL),
          3
        )
        ELSE 0
      END AS avg_rate
    FROM questions q
    LEFT JOIN student_answers sa ON sa.question_id = q.id
      AND sa.answer_session_id IN (SELECT session_id FROM student_sessions)
    WHERE q.question_set_id = p_question_set_id
    GROUP BY q.section_name
    ORDER BY MIN(q.display_order)
  )
  SELECT jsonb_build_object(
    'question_set', (SELECT row_to_json(qi.*) FROM qs_info qi),
    'questions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', aq.id,
          'question_number', aq.question_number,
          'section_name', aq.section_name,
          'min_course', aq.min_course,
          'points', aq.points,
          'display_order', aq.display_order
        ) ORDER BY aq.display_order
      )
      FROM all_questions aq
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', sr.student_id,
          'full_name', sr.full_name,
          'login_id', sr.login_id,
          'course_level', sr.course_level,
          'total_score', sr.total_score,
          'max_score', sr.max_score,
          'accuracy_rate', sr.accuracy_rate,
          'results', COALESCE(sr.results, '{}'::jsonb)
        ) ORDER BY sr.full_name
      )
      FROM student_results sr
    ), '[]'::jsonb),
    'question_stats', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'question_id', qst.question_id,
          'correct_count', qst.correct_count,
          'answered_count', qst.answered_count,
          'rate', qst.rate
        )
      )
      FROM question_stats qst
    ), '[]'::jsonb),
    'section_stats', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'section_name', sst.section_name,
          'question_count', sst.question_count,
          'correct_count', sst.correct_count,
          'answered_count', sst.answered_count,
          'avg_rate', sst.avg_rate
        )
      )
      FROM section_stats sst
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_exercise_master_detail IS '演習問題集の設問×生徒 正誤マトリクス+セクション統計（指導者/admin用）';

REVOKE ALL ON FUNCTION public.get_exercise_master_detail(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exercise_master_detail(BIGINT) TO authenticated;
