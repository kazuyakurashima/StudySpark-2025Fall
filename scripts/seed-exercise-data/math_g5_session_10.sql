-- ============================================================================
-- 小5算数 第10回「総合」演習問題集データ
-- ============================================================================
-- session_id=10 (grade=5, session_number=10), subject_id=1 (算数)
--
-- セクション構成（総合回）:
--   ステップ① → min_course='A' — 12問
--   ステップ② → min_course='B' — 10問
--   ステップ③ → min_course='C' — 8問
--   合計: 30問
--
-- 特記:
--   5(1) に vertex_map あり（A=1, B=2, C=3）。生徒は数字で回答。
--   正解は頂点C = 3。
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

-- 安全ガード: 生徒回答が存在する場合は即中断（未着手前提の確認）
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM answer_sessions ans
  JOIN question_sets qs ON ans.question_set_id = qs.id
  WHERE qs.session_id = 10 AND qs.subject_id = 1 AND qs.grade = 5
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=10)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 10 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 10 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 10 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 10 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 10 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (10, 1, 5, 'exercise_workbook', NULL, '小5第10回 算数 演習問題集「総合」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 12問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '4', '%', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '20', '%', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ①', 'numeric', '10', '%', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', 'ステップ①', 'numeric', '40', 'g', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'numeric', '17', '度', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'numeric', '31', '度', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ①', 'numeric', '210', '円', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ①', 'numeric', '36', '円', 'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(3)', 'ステップ①', 'numeric', '632', '円', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', 'ステップ①', 'numeric', '50.24', 'cm²', 'A', 10);

  -- 5(1) 頂点C → vertex_map: 1=A, 2=B, 3=C / 正解: 頂点=3 (頂点C)
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "頂点"}], "correct_values": {"頂点": "3"}, "template": "{頂点}", "vertex_map": {"1": "A", "2": "B", "3": "C"}}',
    'A', 11);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'numeric', '43.96', 'cm', 'A', 12);

  -- ============================================================
  -- ステップ② — min_course='B' — 10問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ②', 'numeric', '60', 'g', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ②', 'numeric', '40', 'g', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', 'ステップ②', 'numeric', '40.82', 'cm', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ②', 'numeric', '4900', '円', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ②', 'numeric', '168', '個', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ②', 'numeric', '32.56', 'cm', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ②', 'numeric', '130.24', 'cm²', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ②', 'numeric', '6', '%', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ②', 'numeric', '125', 'g', 'B', 109);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', 'ステップ②', 'numeric', '37.68', 'cm', 'B', 110);

  -- ============================================================
  -- ステップ③ — min_course='C' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'numeric', '17', '%', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'numeric', '150', 'g', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ③', 'numeric', '47.14', 'cm', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ③', 'numeric', '184.26', 'cm²', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ③', 'numeric', '4', '個', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ③', 'numeric', '240', '個', 'C', 206);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ③', 'numeric', '25.12', 'cm', 'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ③', 'numeric', '91.075', 'cm²', 'C', 208);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 10
GROUP BY qs.title;
