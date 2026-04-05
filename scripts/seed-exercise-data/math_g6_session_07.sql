-- ============================================================================
-- 小6算数 第7回「平面図形(2)」演習問題集データ
-- ============================================================================
-- session_id=27 (grade=6, session_number=7), subject_id=1 (算数)
--
-- セクション構成（小6通常回）:
--   ステップ① → min_course='A' — 18問
--   ステップ② → min_course='B' —  8問
--   ステップ③ → min_course='C' —  5問
--   合計: 31問
--
-- 特記:
--   比（x：y）は multi_part 2スロット（{前}：{後}）で表現。
--   6(1) は 2スロット（△OCA / △OBC cm²）。
--   6(2) は 4スロット（AD：DB と AO：OE）。
--   分数答えの倍は fraction 型 + unit_label='倍'。
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
  WHERE qs.session_id = 27 AND qs.subject_id = 1 AND qs.grade = 6
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=27)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 27 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 27 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 27 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 27 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 27 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (27, 1, 6, 'exercise_workbook', NULL, '小6第7回 算数 演習問題集「平面図形(2)」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 18問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '16', 'cm', 'A', 1);

  -- 1(2) 25：39
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "25", "後": "39"}, "template": "{前}：{後}"}',
    'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', 'ステップ①', 'numeric', '16', 'cm', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3', 'ステップ①', 'numeric', '15', 'cm²', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', 'ステップ①', 'numeric', '30', 'cm²', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'numeric', '150', 'cm²', 'A', 6);

  -- 5(2) 2：3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "2", "後": "3"}, "template": "{前}：{後}"}',
    'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(3)', 'ステップ①', 'numeric', '60', 'cm²', 'A', 8);

  -- 6(1) △OCA=25cm²、△OBC=30cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "OCA", "unit": "cm²"}, {"label": "OBC", "unit": "cm²"}], "correct_values": {"OCA": "25", "OBC": "30"}, "template": "△OCA{OCA}　△OBC{OBC}"}',
    'A', 9);

  -- 6(2) AD：DB=5：6、AO：OE=3：2
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "AD"}, {"label": "DB"}, {"label": "AO"}, {"label": "OE"}], "correct_values": {"AD": "5", "DB": "6", "AO": "3", "OE": "2"}, "template": "AD：DB＝{AD}：{DB}　AO：OE＝{AO}：{OE}"}',
    'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7(1)', 'ステップ①', 'numeric', '4', 'cm', 'A', 11);

  -- 7(2) 8：5
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '7(2)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "8", "後": "5"}, "template": "{前}：{後}"}',
    'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '8(1)', 'ステップ①', 'numeric', '5.7', 'm', 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '8(2)', 'ステップ①', 'numeric', '3.6', 'm', 'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '8(3)', 'ステップ①', 'numeric', '6.4', 'm', 'A', 15);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '8(4)', 'ステップ①', 'numeric', '4', 'm', 'A', 16);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '9', 'ステップ①', 'numeric', '6.4', 'm', 'A', 17);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '10', 'ステップ①', 'numeric', '1.6', 'm', 'A', 18);

  -- ============================================================
  -- ステップ② — min_course='B' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', 'ステップ②', 'numeric', '12.8', 'cm', 'B', 101);

  -- 2(1) 3：8
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "3", "後": "8"}, "template": "{前}：{後}"}',
    'B', 102);

  -- 2(2) 95/176倍
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ②', 'fraction', '95/176', '倍', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3', 'ステップ②', 'numeric', '43', 'cm²', 'B', 104);

  -- 4(1) 3：1
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "3", "後": "1"}, "template": "{前}：{後}"}',
    'B', 105);

  -- 4(2) 27：7
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "27", "後": "7"}, "template": "{前}：{後}"}',
    'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5', 'ステップ②', 'numeric', '1.8', 'm', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', 'ステップ②', 'numeric', '1.6', 'm（秒速）', 'B', 108);

  -- ============================================================
  -- ステップ③ — min_course='C' — 5問
  -- ============================================================

  -- 1(1) 1：2
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "1", "後": "2"}, "template": "{前}：{後}"}',
    'C', 201);

  -- 1(2) 9：5
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "9", "後": "5"}, "template": "{前}：{後}"}',
    'C', 202);

  -- 1(3) 19/210倍
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ③', 'fraction', '19/210', '倍', 'C', 203);

  -- 2(1) 5：4
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "5", "後": "4"}, "template": "{前}：{後}"}',
    'C', 204);

  -- 2(2) 2：1
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "2", "後": "1"}, "template": "{前}：{後}"}',
    'C', 205);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 27
GROUP BY qs.title;
