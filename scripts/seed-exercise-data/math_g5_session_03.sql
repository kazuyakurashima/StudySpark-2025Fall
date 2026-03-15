-- ============================================================================
-- 小5算数 第3回「割合の利用」演習問題集データ
-- ============================================================================
-- session_id=3 (grade=5, session_number=3), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' — 18問
--   反復問題（練習） → min_course='B' — 11問
--   実戦演習         → min_course='C' — 11問
--   合計: 40問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 3 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 3 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 3 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 3 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 3 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (3, 1, 5, 'exercise_workbook', NULL, '小5第3回 算数 演習問題集「割合の利用」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 18問
  -- ============================================================

  -- 1(1)① ア…46 イ…4 ウ…6
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)①', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}, {"label": "ウ"}], "correct_values": {"ア": "46", "イ": "4", "ウ": "6"}, "template": "ア{ア} イ{イ} ウ{ウ}"}',
    'A', 1);

  -- 1(1)② エ…2.4 オ…240
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)②', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "エ"}, {"label": "オ"}], "correct_values": {"エ": "2.4", "オ": "240"}, "template": "エ{エ} オ{オ}"}',
    'A', 2);

  -- 1(1)③ カ…0.209 キ…20.9
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)③', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "カ"}, {"label": "キ"}], "correct_values": {"カ": "0.209", "キ": "20.9"}, "template": "カ{カ} キ{キ}"}',
    'A', 3);

  -- 1(1)④ ク…5 ケ…5
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)④', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "ク"}, {"label": "ケ"}], "correct_values": {"ク": "5", "ケ": "5"}, "template": "ク{ク} ケ{ケ}"}',
    'A', 4);

  -- 1(2) 26%
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '26', '%', 'A', 5);

  -- 1(3) 1割2分 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "割"}, {"label": "分"}], "correct_values": {"割": "1", "分": "2"}, "template": "{割}割{分}分"}',
    'A', 6);

  -- 1(4) 38cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '38', 'cm', 'A', 7);

  -- 1(5) 210円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'numeric', '210', '円', 'A', 8);

  -- 1(6) 35人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(6)', '反復問題（基本）', 'numeric', '35', '人', 'A', 9);

  -- 1(7) 2000円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(7)', '反復問題（基本）', 'numeric', '2000', '円', 'A', 10);

  -- 1(8) 261ページ
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(8)', '反復問題（基本）', 'numeric', '261', 'ページ', 'A', 11);

  -- 1(9) 63kg
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(9)', '反復問題（基本）', 'numeric', '63', 'kg', 'A', 12);

  -- 2(1) 140人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '140', '人', 'A', 13);

  -- 2(2) 61人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '61', '人', 'A', 14);

  -- 3(1) 12個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'numeric', '12', '個', 'A', 15);

  -- 3(2) 姉…18個 妹…8個 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "姉"}, {"label": "妹"}], "correct_values": {"姉": "18", "妹": "8"}, "template": "姉{姉}個 妹{妹}個"}',
    'A', 16);

  -- 4(1) 1800円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '1800', '円', 'A', 17);

  -- 4(2) 3500円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '3500', '円', 'A', 18);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 11問
  -- ============================================================

  -- 1(1) 600g
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '600', 'g', 'B', 101);

  -- 1(2) 3割4分 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "割"}, {"label": "分"}], "correct_values": {"割": "3", "分": "4"}, "template": "{割}割{分}分"}',
    'B', 102);

  -- 2(1) 240人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '240', '人', 'B', 103);

  -- 2(2) 18人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'numeric', '18', '人', 'B', 104);

  -- 3(1) 30%
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '30', '%', 'B', 105);

  -- 3(2) 300円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '300', '円', 'B', 106);

  -- 4(1) 900円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（練習）', 'numeric', '900', '円', 'B', 107);

  -- 4(2) A…2400円 B…2000円 C…1300円 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "A"}, {"label": "B"}, {"label": "C"}], "correct_values": {"A": "2400", "B": "2000", "C": "1300"}, "template": "A{A}円 B{B}円 C{C}円"}',
    'B', 108);

  -- 5(1) 1/3 → fraction
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '反復問題（練習）', 'fraction', '1/3', NULL, 'B', 109);

  -- 5(2) 180ページ
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '反復問題（練習）', 'numeric', '180', 'ページ', 'B', 110);

  -- 6 赤いボール…96個 白いボール…54個 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "赤"}, {"label": "白"}], "correct_values": {"赤": "96", "白": "54"}, "template": "赤いボール{赤}個 白いボール{白}個"}',
    'B', 111);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 11問
  -- ============================================================

  -- 1(1) 80個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '実戦演習', 'numeric', '80', '個', 'C', 201);

  -- 1(2) 13個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '実戦演習', 'numeric', '13', '個', 'C', 202);

  -- 2(1) 110個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '実戦演習', 'numeric', '110', '個', 'C', 203);

  -- 2(2) 210個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '実戦演習', 'numeric', '210', '個', 'C', 204);

  -- 3(1) 5/12 → fraction
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '実戦演習', 'fraction', '5/12', NULL, 'C', 205);

  -- 3(2) 120ページ
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '実戦演習', 'numeric', '120', 'ページ', 'C', 206);

  -- 4(1) 15枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '実戦演習', 'numeric', '15', '枚', 'C', 207);

  -- 4(2) A…21枚 B…28枚 C…34枚 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "A"}, {"label": "B"}, {"label": "C"}], "correct_values": {"A": "21", "B": "28", "C": "34"}, "template": "A{A}枚 B{B}枚 C{C}枚"}',
    'C', 208);

  -- 5(1) 2/3 → fraction
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '実戦演習', 'fraction', '2/3', NULL, 'C', 209);

  -- 5(2) A…20個 B…16個 C…24個 → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "A"}, {"label": "B"}, {"label": "C"}], "correct_values": {"A": "20", "B": "16", "C": "24"}, "template": "A{A}個 B{B}個 C{C}個"}',
    'C', 210);

  -- 6 A…75cm B…69cm C…96cm → multi_part
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "A"}, {"label": "B"}, {"label": "C"}], "correct_values": {"A": "75", "B": "69", "C": "96"}, "template": "A{A}cm B{B}cm C{C}cm"}',
    'C', 211);

END $$;

COMMIT;

-- 検証クエリ
SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 3
GROUP BY qs.title;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric,
  COUNT(*) FILTER (WHERE q.answer_type = 'fraction') as fraction,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part
FROM questions q JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 3
GROUP BY q.section_name, q.min_course ORDER BY q.min_course;
