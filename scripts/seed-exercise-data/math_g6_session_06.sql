-- ============================================================================
-- 小6算数 第6回「速さ(1)」演習問題集データ
-- ============================================================================
-- session_id=26 (study_sessions.id=26, grade=6, session_number=6), subject_id=1 (算数)
--
-- セクション構成（小6通常回）:
--   ステップ①（必修問題） → min_course='A' — 21問
--   ステップ②             → min_course='B' — 13問
--   ステップ③（難関校対策） → min_course='C' — 6問
--   合計: 40問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 26 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 26 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 26 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 26 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 26 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (26, 1, 6, 'exercise_workbook', NULL, '小6第6回 算数 演習問題集「速さ(1)」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ①（必修問題） — min_course='A' — 21問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '4.8', 'km（時速）', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '12.5', 'm（秒速）', 'A', 2);

  -- 1(3) ア…3　イ…20
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "3", "イ": "20"}, "template": "ア{ア} イ{イ}"}',
    'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', 'ステップ①', 'numeric', '48', 'km', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', 'ステップ①', 'numeric', '28', 'km（時速）', 'A', 5);

  -- 1(6) ア…100　イ…75
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(6)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "100", "イ": "75"}, "template": "ア{ア} イ{イ}"}',
    'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(7)', 'ステップ①', 'numeric', '420', 'm', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(8)', 'ステップ①', 'numeric', '1380', 'm', 'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(9)', 'ステップ①', 'numeric', '90', 'm', 'A', 9);

  -- 1(10) ア…36　イ…720
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(10)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "36", "イ": "720"}, "template": "ア{ア} イ{イ}"}',
    'A', 10);

  -- 2(1) 姉…分速150m　妹…分速50m
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "姉"}, {"label": "妹"}], "correct_values": {"姉": "150", "妹": "50"}, "template": "姉 分速{姉}m　妹 分速{妹}m"}',
    'A', 11);

  -- 2(2) ア…9　イ…450
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "9", "イ": "450"}, "template": "ア{ア} イ{イ}"}',
    'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ①', 'numeric', '600', 'm', 'A', 13);

  -- 3(2) ア…10　イ…400　ウ…15
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}, {"label": "ウ"}], "correct_values": {"ア": "10", "イ": "400", "ウ": "15"}, "template": "ア{ア} イ{イ} ウ{ウ}"}',
    'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ①', 'numeric', '25', 'm', 'A', 15);

  -- 4(2) ア…8　イ…25　ウ…1200
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}, {"label": "ウ"}], "correct_values": {"ア": "8", "イ": "25", "ウ": "1200"}, "template": "ア{ア} イ{イ} ウ{ウ}"}',
    'A', 16);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, min_course, display_order)
  VALUES (v_qs_id, '4(3)', 'ステップ①', 'numeric', '12', 'A', 17);

  -- 5(1) 8：5（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "8", "イ": "5"}, "template": "{ア}：{イ}"}',
    'A', 18);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'numeric', '9', '分後', 'A', 19);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ①', 'numeric', '3', '分', 'A', 20);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ①', 'numeric', '6', '分', 'A', 21);

  -- ============================================================
  -- ステップ② — min_course='B' — 13問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, min_course, display_order)
  VALUES (v_qs_id, '1', 'ステップ②', 'numeric', '2700', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ②', 'numeric', '15', '分後', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ②', 'numeric', '1200', 'm', 'B', 103);

  -- 3(1) 3：1（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "3", "イ": "1"}, "template": "{ア}：{イ}"}',
    'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ②', 'numeric', '18', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(3)', 'ステップ②', 'numeric', '1890', 'm', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ②', 'numeric', '1500', 'm', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ②', 'numeric', '900', 'm', 'B', 108);

  -- 4(3) 5：4（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(3)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "5", "イ": "4"}, "template": "{ア}：{イ}"}',
    'B', 109);

  -- 5(1) 午前8時54分
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "時"}, {"label": "分"}], "correct_values": {"時": "8", "分": "54"}, "template": "午前{時}時{分}分"}',
    'B', 110);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ②', 'numeric', '1860', 'm', 'B', 111);

  -- 6(1) 8：3（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "8", "イ": "3"}, "template": "{ア}：{イ}"}',
    'B', 112);

  -- 6(2) 17分36秒
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "分"}, {"label": "秒"}], "correct_values": {"分": "17", "秒": "36"}, "template": "{分}分{秒}秒"}',
    'B', 113);

  -- ============================================================
  -- ステップ③（難関校対策） — min_course='C' — 6問
  -- ============================================================

  -- 1(1) 28：33（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "28", "イ": "33"}, "template": "{ア}：{イ}"}',
    'C', 201);

  -- 1(2) 午前10時16分
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "時"}, {"label": "分"}], "correct_values": {"時": "10", "分": "16"}, "template": "午前{時}時{分}分"}',
    'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ③', 'numeric', '4400', 'm', 'C', 203);

  -- 2(1) 5：3（比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "5", "イ": "3"}, "template": "{ア}：{イ}"}',
    'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ③', 'numeric', '60', '秒', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', 'ステップ③', 'numeric', '225', '秒後', 'C', 206);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 26 AND qs.grade = 6
GROUP BY qs.title;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part
FROM questions q JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 26 AND qs.grade = 6
GROUP BY q.section_name, q.min_course ORDER BY q.min_course;
