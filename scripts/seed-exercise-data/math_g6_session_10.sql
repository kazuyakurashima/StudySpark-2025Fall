-- ============================================================================
-- 小6算数 第10回「割合と比の文章題」演習問題集データ
-- ============================================================================
-- session_id=30 (grade=6, session_number=10), subject_id=1 (算数)
--
-- セクション構成（小6通常回）:
--   ステップ① → min_course='A' — 23問
--   ステップ② → min_course='B' — 13問
--   ステップ③ → min_course='C' —  5問
--   合計: 41問
--
-- 特記:
--   ステップ① 1(1)〜5(3) は問題文に単位が含まれるため unit_label=NULL。
--   3(1) は multi_part（ア・イ 2スロット）。
--   ステップ② 2(1), 2(2) は multi_part（A/B/C 匹、3スロット）。
--   ステップ② 3(1) は比 multi_part 2スロット。
--   ステップ③ 3 は multi_part（A=7%, B=19%）。
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
  WHERE qs.session_id = 30 AND qs.subject_id = 1 AND qs.grade = 6
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=30)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 30 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 30 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 30 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 30 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 30 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (30, 1, 6, 'exercise_workbook', NULL, '小6第10回 算数 演習問題集「割合と比の文章題」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 23問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '105', NULL, 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '115', NULL, 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ①', 'numeric', '5.6', NULL, 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'numeric', '520', NULL, 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'numeric', '128', NULL, 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', 'ステップ①', 'numeric', '55', NULL, 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(4)', 'ステップ①', 'numeric', '16', NULL, 'A', 7);

  -- 3(1) ア…10，イ…3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}], "correct_values": {"ア": "10", "イ": "3"}, "template": "ア{ア}　イ{イ}"}',
    'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ①', 'numeric', '20', NULL, 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(3)', 'ステップ①', 'numeric', '4500', NULL, 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ①', 'numeric', '10', NULL, 'A', 11);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ①', 'numeric', '50', NULL, 'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(3)', 'ステップ①', 'numeric', '8', NULL, 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(4)', 'ステップ①', 'numeric', '13', NULL, 'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(5)', 'ステップ①', 'numeric', '40', NULL, 'A', 15);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'numeric', '24', NULL, 'A', 16);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'numeric', '750', NULL, 'A', 17);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(3)', 'ステップ①', 'numeric', '7290', NULL, 'A', 18);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ①', 'numeric', '45', '分', 'A', 19);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ①', 'numeric', '14', '分', 'A', 20);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(3)', 'ステップ①', 'numeric', '32', '分', 'A', 21);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7(1)', 'ステップ①', 'numeric', '12', '人（毎分）', 'A', 22);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7(2)', 'ステップ①', 'numeric', '9', '分', 'A', 23);

  -- ============================================================
  -- ステップ② — min_course='B' — 13問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', 'ステップ②', 'numeric', '1000', '円', 'B', 101);

  -- 2(1) A…8匹，B…12匹，C…16匹
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "A", "unit": "匹"}, {"label": "B", "unit": "匹"}, {"label": "C", "unit": "匹"}], "correct_values": {"A": "8", "B": "12", "C": "16"}, "template": "A{A}　B{B}　C{C}"}',
    'B', 102);

  -- 2(2) A…12匹，B…14匹，C…10匹
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "A", "unit": "匹"}, {"label": "B", "unit": "匹"}, {"label": "C", "unit": "匹"}], "correct_values": {"A": "12", "B": "14", "C": "10"}, "template": "A{A}　B{B}　C{C}"}',
    'B', 103);

  -- 3(1) 2：3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "2", "後": "3"}, "template": "{前}：{後}"}',
    'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ②', 'numeric', '12', '日', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(3)', 'ステップ②', 'numeric', '13', '日目', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ②', 'numeric', '150', 'g', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ②', 'numeric', '120', 'g', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ②', 'numeric', '7200', '円', 'B', 109);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ②', 'numeric', '150', '円', 'B', 110);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(3)', 'ステップ②', 'numeric', '180', '個', 'B', 111);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ②', 'numeric', '60', '人（毎分）', 'B', 112);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ②', 'numeric', '5', '分', 'B', 113);

  -- ============================================================
  -- ステップ③ — min_course='C' — 5問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'numeric', '120', 'ページ', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'numeric', '60', '枚', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', 'ステップ③', 'numeric', '1200', '円', 'C', 203);

  -- 3: A…7%，B…19%
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "A", "unit": "%"}, {"label": "B", "unit": "%"}], "correct_values": {"A": "7", "B": "19"}, "template": "A{A}　B{B}"}',
    'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', 'ステップ③', 'numeric', '12', '日', 'C', 205);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 30
GROUP BY qs.title;
