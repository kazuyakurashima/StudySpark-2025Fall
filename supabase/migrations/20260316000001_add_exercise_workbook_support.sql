-- ============================================================================
-- Phase 1A: 演習問題集（exercise_workbook）対応
-- ============================================================================
-- 目的: 既存テーブルを拡張し、マスタープリントと演習問題集を共存可能にする
-- 影響: question_sets, questions テーブルへのカラム追加 + インデックス再構築
-- 既存データ: master_print として自動分類。既存動作に影響なし
-- ロールバック: DROP COLUMN + 旧インデックス再作成

-- ============================================================
-- 1. question_sets: 問題セットの種別区別
-- ============================================================
ALTER TABLE question_sets ADD COLUMN set_type VARCHAR(20)
  NOT NULL DEFAULT 'master_print'
  CHECK (set_type IN ('master_print', 'exercise_workbook'));

-- ============================================================
-- 2. question_sets: 教材バリアント識別
--    小6（下）は2種類の教材がある。Phase 1AではNULL。
--    将来 'A' / 'B' 等で区別可能にする拡張軸。
-- ============================================================
ALTER TABLE question_sets ADD COLUMN edition VARCHAR(20) DEFAULT NULL;

-- ============================================================
-- 3. questions: コース別フィルタ
--    既存master_print問題はNULL（全コース表示）
--    exercise_workbook問題はmin_courseを設定
-- ============================================================
ALTER TABLE questions ADD COLUMN min_course course_level;

-- ============================================================
-- 4. コース比較関数（ENUM定義順に依存しない安全な比較）
--    course_rank('A') = 1, 'B' = 2, 'C' = 3, 'S' = 4
--    IMMUTABLE なのでインデックスにも使用可能
-- ============================================================
CREATE OR REPLACE FUNCTION course_rank(c course_level)
RETURNS SMALLINT IMMUTABLE LANGUAGE SQL AS $$
  SELECT CASE c
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'S' THEN 4
  END;
$$;

-- ============================================================
-- 5. 一意制約の再構築
--    既存: idx_question_sets_session_subject_order
--          ON (session_id, subject_id, display_order)
--    問題: master_print と exercise_workbook が同一
--          session/subject/display_order=1 で衝突する
--    対策: set_type 別の部分ユニークインデックスに置換
-- ============================================================

-- 5a. 既存インデックスを削除
DROP INDEX IF EXISTS idx_question_sets_session_subject_order;

-- 5b. master_print 用（既存動作を保持）
CREATE UNIQUE INDEX idx_question_sets_master_print_unique
  ON question_sets (session_id, subject_id, display_order)
  WHERE set_type = 'master_print';

-- 5c. exercise_workbook 用（1回 = 1セット）
--     edition を含めることで、将来の教材バリアント同居にも対応
CREATE UNIQUE INDEX idx_question_sets_exercise_unique
  ON question_sets (session_id, subject_id, grade, COALESCE(edition, ''))
  WHERE set_type = 'exercise_workbook';

-- ============================================================
-- 6. パフォーマンス用インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_question_sets_exercise_lookup
  ON question_sets (session_id, subject_id, grade)
  WHERE set_type = 'exercise_workbook';

CREATE INDEX IF NOT EXISTS idx_questions_min_course
  ON questions (min_course)
  WHERE min_course IS NOT NULL;

-- ============================================================
-- 7. 既存 CHECK 制約の修正
--    chk_math_assessment_master_id は算数(subject_id=1)に
--    assessment_master_id NOT NULL を強制するが、
--    exercise_workbook は assessment_master_id を持たない。
--    → master_print の場合のみに限定する。
-- ============================================================
ALTER TABLE question_sets DROP CONSTRAINT IF EXISTS chk_math_assessment_master_id;
ALTER TABLE question_sets ADD CONSTRAINT chk_math_assessment_master_id
  CHECK (
    subject_id != 1
    OR set_type != 'master_print'
    OR assessment_master_id IS NOT NULL
  );

-- ============================================================
-- 8. 演習問題集用セッション作成 RPC
--    1トランザクションで以下を原子的に実行:
--    0) advisory lock で生徒×問題セットの排他制御（初回0件でも保護）
--    1) 旧 is_latest=true を false に更新
--    2) attempt_number を採番
--    3) 新セッション作成（is_latest=true）
--    → is_latest 部分ユニークインデックス違反を防止
--    → 初回アテンプト（既存行0件）の同時実行でも1件成功・1件待機
-- ============================================================
CREATE OR REPLACE FUNCTION create_exercise_session(
  p_student_id BIGINT,
  p_question_set_id BIGINT
)
RETURNS TABLE(id BIGINT, attempt_number SMALLINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_attempt SMALLINT;
  v_new_id BIGINT;
BEGIN
  -- 0. トランザクション内 advisory lock（コミット/ロールバックで自動解放）
  --    student_id と question_set_id の組み合わせでロックキーを生成
  PERFORM pg_advisory_xact_lock(
    hashtext('exercise_session'),
    hashtext(p_student_id::text || ':' || p_question_set_id::text)
  );

  -- 1. 旧 is_latest を false に更新
  UPDATE answer_sessions
  SET is_latest = false
  WHERE student_id = p_student_id
    AND question_set_id = p_question_set_id
    AND is_latest = true;

  -- 2. 次の attempt_number を採番
  SELECT COALESCE(MAX(a.attempt_number), 0) + 1
  INTO v_next_attempt
  FROM answer_sessions a
  WHERE a.student_id = p_student_id
    AND a.question_set_id = p_question_set_id;

  -- 3. 新セッション作成
  INSERT INTO answer_sessions (
    student_id, question_set_id, attempt_number, is_latest, status
  ) VALUES (
    p_student_id, p_question_set_id, v_next_attempt, true, 'in_progress'
  )
  RETURNING answer_sessions.id, answer_sessions.attempt_number
  INTO v_new_id, v_next_attempt;

  RETURN QUERY SELECT v_new_id, v_next_attempt;
END;
$$;

-- service_role のみ実行可能（Server Actions 経由）
REVOKE EXECUTE ON FUNCTION public.create_exercise_session(BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_exercise_session(BIGINT, BIGINT) TO service_role;
