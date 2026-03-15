-- ============================================================================
-- 小5算数 第5回「総合」演習問題集データ
-- ============================================================================
-- session_id=5 (grade=5, session_number=5), subject_id=1 (算数)
--
-- セクション構成（総合回）:
--   ステップ① → min_course='A' — 13問
--   ステップ② → min_course='B' — 9問
--   ステップ③ → min_course='C' — 10問
--   合計: 32問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 5 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 5 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 5 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 5 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 5 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (5, 1, 5, 'exercise_workbook', NULL, '小5第5回 算数 演習問題集「総合」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 13問
  -- ============================================================

  -- 1(1) 5、9、15、45 ※すべて → multi_part 昇順4欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}, {"label": "③"}, {"label": "④"}], "correct_values": {"①": "5", "②": "9", "③": "15", "④": "45"}, "template": "{①}, {②}, {③}, {④}"}',
    'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '159', NULL, 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ①', 'numeric', '99', NULL, 'A', 3);

  -- 1(4) 26、66、106 ※順に3つ → multi_part 3欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(4)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "1番目"}, {"label": "2番目"}, {"label": "3番目"}], "correct_values": {"1番目": "26", "2番目": "66", "3番目": "106"}, "template": "{1番目}, {2番目}, {3番目}"}',
    'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'numeric', '34', 'cm²', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'numeric', '32', 'cm²', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3', 'ステップ①', 'numeric', '31.4', 'cm²', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ①', 'numeric', '320', 'g', 'A', 8);

  -- 4(2) 3割5分 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "割"}, {"label": "分"}], "correct_values": {"割": "3", "分": "5"}, "template": "{割}割{分}分"}',
    'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(3)', 'ステップ①', 'numeric', '140', 'ページ', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(4)', 'ステップ①', 'numeric', '1500', '円', 'A', 11);

  -- 5(1) 18人、150枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}], "correct_values": {"①": "18", "②": "150"}, "template": "{①}人、{②}枚"}',
    'A', 12);

  -- 5(2) 14人、1700円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}], "correct_values": {"①": "14", "②": "1700"}, "template": "{①}人、{②}円"}',
    'A', 13);

  -- 5(3) 12本、1560円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(3)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}], "correct_values": {"①": "12", "②": "1560"}, "template": "{①}本、{②}円"}',
    'A', 14);

  -- ============================================================
  -- ステップ② — min_course='B' — 9問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ②', 'numeric', '998', NULL, 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ②', 'numeric', '14732', NULL, 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', 'ステップ②', 'numeric', '176', 'cm²', 'B', 103);

  -- 3 A…15L B…21L C…24L
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "A"}, {"label": "B"}, {"label": "C"}], "correct_values": {"A": "15", "B": "21", "C": "24"}, "template": "A{A}L B{B}L C{C}L"}',
    'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', 'ステップ②', 'numeric', '120', '人', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ②', 'numeric', '840', '円', 'B', 106);

  -- 5(2) アメ…12個 チョコレート…18個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "アメ"}, {"label": "チョコレート"}], "correct_values": {"アメ": "12", "チョコレート": "18"}, "template": "アメ{アメ}個 チョコレート{チョコレート}個"}',
    'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', 'ステップ②', 'numeric', '20.56', 'cm²', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7', 'ステップ②', 'numeric', '15.7', 'cm', 'B', 109);

  -- ============================================================
  -- ステップ③ — min_course='C' — 10問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'numeric', '121', '個', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'numeric', '114', '個', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', 'ステップ③', 'numeric', '27.84', 'cm²', 'C', 203);

  -- 3(1) リンゴ…8個 ナシ…12個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "リンゴ"}, {"label": "ナシ"}], "correct_values": {"リンゴ": "8", "ナシ": "12"}, "template": "リンゴ{リンゴ}個 ナシ{ナシ}個"}',
    'C', 204);

  -- 3(2) リンゴ…160円 ナシ…125円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "リンゴ"}, {"label": "ナシ"}], "correct_values": {"リンゴ": "160", "ナシ": "125"}, "template": "リンゴ{リンゴ}円 ナシ{ナシ}円"}',
    'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ③', 'numeric', '54000', '円', 'C', 206);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ③', 'numeric', '47000', '円', 'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ③', 'numeric', '189', '回', 'C', 208);

  -- 5(2) 午前0時16分30秒 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "時"}, {"label": "分"}, {"label": "秒"}], "correct_values": {"時": "0", "分": "16", "秒": "30"}, "template": "午前{時}時{分}分{秒}秒"}',
    'C', 209);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', 'ステップ③', 'numeric', '7.85', 'cm²', 'C', 210);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 5
GROUP BY qs.title;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part
FROM questions q JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 5
GROUP BY q.section_name, q.min_course ORDER BY q.min_course;
