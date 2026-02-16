-- ============================================================================
-- 算数マスタープリント 指導者閲覧機能: スキーマ変更 + RLS + RPC
-- ============================================================================
-- 計画書: docs/plans/math-master-print-coach-view.md
-- 概要:
--   1. question_sets.assessment_master_id 追加 + 既存データ紐付け
--   2. admin 向け RLS ポリシー追加（answer_sessions / student_answers）
--   3. 集計用インデックス追加
--   4. get_math_master_summary / get_math_master_detail RPC 作成
--
-- 既存データへの影響:
--   - question_sets にカラム追加（NULLABLE → 部分 CHECK で算数のみ NOT NULL）
--   - 既存 answer_sessions / student_answers の RLS に admin ポリシー追加（SELECT のみ）
--   - 既存機能への破壊的変更なし
--
-- ============================================================
-- ★ 適用前検証（本番適用前に SQL Editor で実行し、結果を確認すること）
-- ============================================================
--
-- 1. 算数 question_sets と assessment_masters の紐付け候補を確認:
--
--   SELECT qs.id, qs.grade, qs.display_order, ss.session_number,
--          am.id AS matched_master_id
--   FROM question_sets qs
--   JOIN study_sessions ss ON ss.id = qs.session_id
--   LEFT JOIN assessment_masters am
--     ON am.assessment_type = 'math_print'
--     AND am.grade = CASE WHEN qs.grade = 5 THEN '5年' ELSE '6年' END
--     AND am.session_number = ss.session_number
--     AND am.attempt_number = qs.display_order
--   WHERE qs.subject_id = 1;
--
-- 2. 紐付け不可の算数セット（0件であること — CHECK 制約追加の前提）:
--
--   SELECT qs.id, qs.grade, qs.display_order, ss.session_number
--   FROM question_sets qs
--   JOIN study_sessions ss ON ss.id = qs.session_id
--   LEFT JOIN assessment_masters am
--     ON am.assessment_type = 'math_print'
--     AND am.grade = CASE WHEN qs.grade = 5 THEN '5年' ELSE '6年' END
--     AND am.session_number = ss.session_number
--     AND am.attempt_number = qs.display_order
--   WHERE qs.subject_id = 1
--     AND am.id IS NULL;
--
--   → 0件でなければ CHECK 制約追加が失敗する。先にマスタデータを補完すること。

-- ============================================================
-- 1. question_sets.assessment_master_id 追加
-- ============================================================

-- 1-1. カラム追加（冪等: IF NOT EXISTS 相当。カラム存在時はエラーになるため初回のみ適用）
ALTER TABLE public.question_sets
  ADD COLUMN IF NOT EXISTS assessment_master_id UUID REFERENCES public.assessment_masters(id);

COMMENT ON COLUMN public.question_sets.assessment_master_id
  IS 'assessment_masters への明示的紐付け（算数セットは NOT NULL 必須）';

-- 1-2. 既存データの紐付け（session_id + display_order → session_number + attempt_number）
UPDATE public.question_sets qs
SET assessment_master_id = am.id
FROM public.assessment_masters am
JOIN public.study_sessions ss ON ss.id = qs.session_id
WHERE am.assessment_type = 'math_print'
  AND am.grade = CASE WHEN qs.grade = 5 THEN '5年' ELSE '6年' END
  AND am.session_number = ss.session_number
  AND am.attempt_number = qs.display_order
  AND qs.subject_id = 1;  -- 算数のみ

-- 1-3. 算数セットの NOT NULL 制約（部分 CHECK で算数のみに適用）
ALTER TABLE public.question_sets
  ADD CONSTRAINT chk_math_assessment_master_id
  CHECK (subject_id != 1 OR assessment_master_id IS NOT NULL);

-- 1-4. 1マスタ : 1セットの UNIQUE 制約
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_sets_assessment_master
  ON public.question_sets (assessment_master_id)
  WHERE assessment_master_id IS NOT NULL;

-- ============================================================
-- 2. admin 向け RLS ポリシー追加
-- ============================================================

-- answer_sessions: admin SELECT（冪等: 既存ポリシー存在時はスキップ）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'answer_sessions' AND policyname = 'admin_select_answer_sessions'
  ) THEN
    CREATE POLICY "admin_select_answer_sessions"
      ON public.answer_sessions
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- student_answers: admin SELECT（冪等: 既存ポリシー存在時はスキップ）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_answers' AND policyname = 'admin_select_student_answers'
  ) THEN
    CREATE POLICY "admin_select_student_answers"
      ON public.student_answers
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- ============================================================
-- 3. 集計用インデックス
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_student_answers_session_correct
  ON public.student_answers (answer_session_id, is_correct);

-- ============================================================
-- 4. get_math_master_summary RPC
-- ============================================================
-- 指導者が担当生徒の算数マスタープリント結果をサマリーで取得
-- SECURITY DEFINER: auth.uid() から内部で coach_id を解決（外部パラメータ不要）

CREATE OR REPLACE FUNCTION public.get_math_master_summary(p_grade SMALLINT)
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
  v_grade_str TEXT;
  v_result JSONB;
BEGIN
  -- auth.uid() が NULL の場合は即拒否（service_role 経由の呼び出しを防止）
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

  -- 学年文字列変換
  v_grade_str := CASE p_grade WHEN 5 THEN '5年' WHEN 6 THEN '6年' END;
  IF v_grade_str IS NULL THEN
    RAISE EXCEPTION 'Invalid grade: %. Must be 5 or 6.', p_grade;
  END IF;

  -- 集計クエリ
  WITH target_students AS (
    -- coach: 担当生徒のみ、admin: 該当学年の全生徒
    SELECT s.id AS student_id
    FROM students s
    WHERE s.grade = p_grade
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
  -- assessment_masters の全回一覧（設問マスタ有無にかかわらず）
  all_masters AS (
    SELECT am.id, am.session_number, am.attempt_number, am.max_score,
           COALESCE(am.title, '第' || am.session_number || '回') AS title
    FROM assessment_masters am
    WHERE am.assessment_type = 'math_print'
      AND am.grade = v_grade_str
  ),
  -- question_sets が紐付いている masters のみ
  linked_sets AS (
    SELECT qs.id AS question_set_id,
           qs.assessment_master_id,
           qs.display_order,
           COUNT(q.id) AS total_questions
    FROM question_sets qs
    LEFT JOIN questions q ON q.question_set_id = qs.id
    WHERE qs.assessment_master_id IS NOT NULL
      AND qs.subject_id = 1
      AND qs.status = 'approved'
    GROUP BY qs.id, qs.assessment_master_id, qs.display_order
  ),
  -- 提出済みセッション集計（max_score は am.max_score を正とするため、ここでは不要）
  session_stats AS (
    SELECT
      ase.question_set_id,
      COUNT(*) AS submitted_count,
      AVG(ase.total_score) AS avg_score
    FROM answer_sessions ase
    WHERE ase.is_latest = true
      AND ase.status = 'graded'
      AND ase.student_id IN (SELECT student_id FROM target_students)
    GROUP BY ase.question_set_id
  )
  SELECT jsonb_build_object(
    'grade', p_grade,
    'total_students', (SELECT cnt FROM total_student_count),
    'sessions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_number', am.session_number,
          'attempt_number', am.attempt_number,
          'title', am.title,
          'question_set_id', ls.question_set_id,
          'has_question_set', ls.question_set_id IS NOT NULL,
          'total_questions', COALESCE(ls.total_questions, 0),
          'submitted_count', COALESCE(ss.submitted_count, 0),
          'total_students', (SELECT cnt FROM total_student_count),
          'avg_score', ROUND(COALESCE(ss.avg_score, 0)::NUMERIC, 1),
          'max_score', am.max_score,
          'avg_rate', CASE
            WHEN am.max_score > 0 AND ss.avg_score IS NOT NULL
            THEN ROUND((ss.avg_score / am.max_score)::NUMERIC, 3)
            ELSE 0
          END
        ) ORDER BY am.session_number, am.attempt_number
      )
      FROM all_masters am
      LEFT JOIN linked_sets ls ON ls.assessment_master_id = am.id
      LEFT JOIN session_stats ss ON ss.question_set_id = ls.question_set_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_math_master_summary IS '算数マスタープリントの回別サマリー（指導者/admin用）';

REVOKE ALL ON FUNCTION public.get_math_master_summary(SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_math_master_summary(SMALLINT) TO authenticated;

-- ============================================================
-- 5. get_math_master_detail RPC
-- ============================================================
-- 指定した question_set の全設問 × 担当全生徒の正誤マトリクスを返す

CREATE OR REPLACE FUNCTION public.get_math_master_detail(p_question_set_id BIGINT)
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
  -- auth.uid() が NULL の場合は即拒否
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

  -- question_set の学年を取得（算数専用 RPC: subject_id=1 かつ approved のみ許可）
  SELECT grade INTO v_qs_grade
  FROM question_sets
  WHERE id = p_question_set_id
    AND subject_id = 1
    AND status = 'approved';
  IF v_qs_grade IS NULL THEN
    RAISE EXCEPTION 'Question set not found or not an approved math set: %', p_question_set_id;
  END IF;

  WITH target_students AS (
    SELECT s.id AS student_id, s.full_name, s.login_id
    FROM students s
    WHERE s.grade = v_qs_grade
      AND (
        v_role = 'admin'
        OR EXISTS (
          SELECT 1 FROM coach_student_relations csr
          WHERE csr.coach_id = v_coach_id AND csr.student_id = s.id
        )
      )
  ),
  qs_info AS (
    SELECT qs.id, qs.title, qs.grade, qs.display_order,
           am.session_number, am.max_score AS master_max_score
    FROM question_sets qs
    LEFT JOIN assessment_masters am ON am.id = qs.assessment_master_id
    WHERE qs.id = p_question_set_id
  ),
  all_questions AS (
    SELECT q.id, q.question_number, q.section_name, q.points, q.display_order
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
      ss.total_score,
      ss.max_score,
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
  )
  SELECT jsonb_build_object(
    'question_set', (SELECT row_to_json(qi.*) FROM qs_info qi),
    'questions', COALESCE((
      SELECT jsonb_agg(row_to_json(aq.*) ORDER BY aq.display_order)
      FROM all_questions aq
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', sr.student_id,
          'full_name', sr.full_name,
          'login_id', sr.login_id,
          'total_score', sr.total_score,
          'max_score', sr.max_score,
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
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_math_master_detail IS '算数マスタープリントの設問×生徒 正誤マトリクス（指導者/admin用）';

REVOKE ALL ON FUNCTION public.get_math_master_detail(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_math_master_detail(BIGINT) TO authenticated;
