-- ============================================================================
-- 小5算数 第9回「円の回転・転がり移動」演習問題集データ
-- ============================================================================
-- session_id=9 (grade=5, session_number=9), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' — 11問
--   反復問題（練習） → min_course='B' — 9問
--   実戦演習         → min_course='C' — 8問
--   合計: 28問
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
  WHERE qs.session_id = 9 AND qs.subject_id = 1 AND qs.grade = 5
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=9)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 9 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 9 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 9 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 9 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 9 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (9, 1, 5, 'exercise_workbook', NULL, '小5第9回 算数 演習問題集「円の回転・転がり移動」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 11問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '115', '度', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '17.14', 'cm²', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '12.56', 'cm', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '24', 'cm', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'numeric', '47.1', 'cm²', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '31.4', 'cm', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '28.26', 'cm²', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'numeric', '15.7', 'cm', 'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '47.1', 'cm²', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '36.28', 'cm', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '72.56', 'cm²', 'A', 11);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 9問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', '反復問題（練習）', 'numeric', '62.8', 'cm²', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '17.42', 'cm', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'numeric', '34.84', 'cm²', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '24.28', 'cm', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '48.56', 'cm²', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', '反復問題（練習）', 'numeric', '62.8', 'cm', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5', '反復問題（練習）', 'numeric', '94.2', 'cm²', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '反復問題（練習）', 'numeric', '26.28', 'cm', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '反復問題（練習）', 'numeric', '116.82', 'cm²', 'B', 109);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', '実戦演習', 'numeric', '65.94', 'cm²', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', '実戦演習', 'numeric', '42.56', 'cm²', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '実戦演習', 'numeric', '36.84', 'cm', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '実戦演習', 'numeric', '147.36', 'cm²', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '実戦演習', 'numeric', '91.7', 'cm', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '実戦演習', 'numeric', '365.94', 'cm²', 'C', 206);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '実戦演習', 'numeric', '109.28', 'cm', 'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '実戦演習', 'numeric', '921.04', 'cm²', 'C', 208);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 9
GROUP BY qs.title;
