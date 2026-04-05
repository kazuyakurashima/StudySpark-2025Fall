-- ============================================================================
-- 小5算数 第8回「多角形の回転・転がり移動」演習問題集データ
-- ============================================================================
-- session_id=8 (grade=5, session_number=8), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' — 11問
--   反復問題（練習） → min_course='B' — 8問
--   実戦演習         → min_course='C' — 8問
--   合計: 27問
--
-- 特記:
--   3(1) に vertex_map あり（A=1, B=2, C=3）。生徒は数字で回答。
--   3(2) は図形の問題で「長さ」のみ採点（図の描写は採点対象外）。
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 8 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 8 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 8 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 8 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 8 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (8, 1, 5, 'exercise_workbook', NULL, '小5第8回 算数 演習問題集「多角形の回転・転がり移動」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 11問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '44', '度', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '141', '度', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '12', 'cm', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '12.56', 'cm²', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'numeric', '118.2', 'cm²', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '65', '度', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '32', '度', 'A', 7);

  -- 3(1) 左から順に A, B, C → vertex_map: 1=A, 2=B, 3=C / 正解: ①=1, ②=2, ③=3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}, {"label": "③"}], "correct_values": {"①": "1", "②": "2", "③": "3"}, "template": "左から順に {①} {②} {③}", "vertex_map": {"1": "A", "2": "B", "3": "C"}}',
    'A', 8);

  -- 3(2) 長さのみ採点（図の描写は採点対象外）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '25.12', 'cm', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '9.42', 'cm', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '56.52', 'cm²', 'A', 11);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '12.56', 'cm', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'numeric', '188.4', 'cm²', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '125.6', 'cm²', 'B', 103);

  -- 2(2) ①6cm ②200.96cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "①", "unit": "cm"}, {"label": "②", "unit": "cm²"}], "correct_values": {"①": "6", "②": "200.96"}, "template": "①{①}cm ②{②}cm²"}',
    'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '31.4', 'cm', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '18.84', 'cm', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（練習）', 'numeric', '164.48', 'cm²', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（練習）', 'numeric', '264.96', 'cm²', 'B', 108);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', '実戦演習', 'numeric', '24', '度', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '実戦演習', 'numeric', '9.42', 'cm', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '実戦演習', 'numeric', '42.39', 'cm²', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3', '実戦演習', 'numeric', '18.84', 'cm', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', '実戦演習', 'numeric', '20.41', 'cm', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '実戦演習', 'numeric', '55', '度', 'C', 206);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '実戦演習', 'numeric', '70.54', 'cm²', 'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', '実戦演習', 'numeric', '31.4', 'cm²', 'C', 208);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 8
GROUP BY qs.title;
