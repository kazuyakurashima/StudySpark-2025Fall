-- ============================================================================
-- 小5算数 第6回「濃さ」演習問題集データ
-- ============================================================================
-- session_id=6 (grade=5, session_number=6), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' — 17問
--   反復問題（練習） → min_course='B' — 13問
--   実戦演習         → min_course='C' — 11問
--   合計: 41問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 6 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 6 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 6 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 6 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 6 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (6, 1, 5, 'exercise_workbook', NULL, '小5第6回 算数 演習問題集「濃さ」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 17問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '15', '%', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '6', '%', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '24', 'g', 'A', 3);

  -- 1(4) 水…264g 食塩…36g
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "水"}, {"label": "食塩"}], "correct_values": {"水": "264", "食塩": "36"}, "template": "水{水}g 食塩{食塩}g"}',
    'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'numeric', '250', 'g', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(6)', '反復問題（基本）', 'numeric', '470', 'g', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(7)', '反復問題（基本）', 'numeric', '12', '%', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(8)', '反復問題（基本）', 'numeric', '10', '%', 'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(9)', '反復問題（基本）', 'numeric', '20', '%', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '20', 'g', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '7.5', '%', 'A', 11);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'numeric', '11', '%', 'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '5', '%', 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '45', 'g', 'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '15', '%', 'A', 15);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '反復問題（基本）', 'numeric', '90', '%', 'A', 16);

  -- 5(2) 食塩水…250g 食塩…25g
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "食塩水"}, {"label": "食塩"}], "correct_values": {"食塩水": "250", "食塩": "25"}, "template": "食塩水{食塩水}g 食塩{食塩}g"}',
    'A', 17);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 13問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '50', 'g', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'numeric', '5', '%', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '15', '%', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'numeric', '10', '%', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '25', 'g', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '210', 'g', 'B', 106);

  -- 4(1) ア…240 イ…60
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "240", "イ": "60"}, "template": "ア{ア} イ{イ}"}',
    'B', 107);

  -- 4(2) ウ…200 エ…500
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "ウ"}, {"label": "エ"}], "correct_values": {"ウ": "200", "エ": "500"}, "template": "ウ{ウ} エ{エ}"}',
    'B', 108);

  -- 4(3) オ…200 カ…100
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(3)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "オ"}, {"label": "カ"}], "correct_values": {"オ": "200", "カ": "100"}, "template": "オ{オ} カ{カ}"}',
    'B', 109);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '反復問題（練習）', 'numeric', '9', '%', 'B', 110);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '反復問題（練習）', 'numeric', '200', 'g', 'B', 111);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '反復問題（練習）', 'numeric', '100', 'g', 'B', 112);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '反復問題（練習）', 'numeric', '500', 'g', 'B', 113);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 11問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '実戦演習', 'numeric', '270', 'g', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '実戦演習', 'numeric', '20', 'g', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '実戦演習', 'numeric', '4', '%', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '実戦演習', 'numeric', '6', '%', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '実戦演習', 'numeric', '10', '%', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '実戦演習', 'numeric', '12', '%', 'C', 206);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '実戦演習', 'numeric', '15', '%', 'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '実戦演習', 'numeric', '35', '秒後', 'C', 208);

  -- 5 ア…8 イ…300
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "8", "イ": "300"}, "template": "ア{ア} イ{イ}"}',
    'C', 209);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '実戦演習', 'numeric', '60', 'g', 'C', 210);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '実戦演習', 'numeric', '15', 'g', 'C', 211);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 6
GROUP BY qs.title;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part
FROM questions q JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 6
GROUP BY q.section_name, q.min_course ORDER BY q.min_course;
