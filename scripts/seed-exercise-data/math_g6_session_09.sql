-- ============================================================================
-- 小6算数 第9回「総合」演習問題集データ
-- ============================================================================
-- session_id=29 (grade=6, session_number=9), subject_id=1 (算数)
--
-- セクション構成（小6通常回）:
--   ステップ① → min_course='A' — 16問
--   ステップ② → min_course='B' — 12問
--   ステップ③ → min_course='C' —  6問（うち1問は解説参照）
--   合計: 34問
--
-- 特記:
--   比は multi_part 2スロット（{前}：{後}）。
--   3項比は multi_part 3スロット（{第1}：{第2}：{第3}）。
--   分数×倍は fraction 型 + unit_label='倍'。
--   6(1) は 2スロット（2つの時刻、unit='分後'）。
--   6(2) は帯分数 multi_part 3スロット（整数部 + 分子 + 分母）。
--   ステップ③ 2(1) は解説参照（入力なし）。
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
  WHERE qs.session_id = 29 AND qs.subject_id = 1 AND qs.grade = 6
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=29)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 29 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 29 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 29 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 29 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 29 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (29, 1, 6, 'exercise_workbook', NULL, '小6第9回 算数 演習問題集「総合」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 16問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '40', 'm（分速）', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '2.4', 'km', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', 'ステップ①', 'numeric', '14.4', 'cm²', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', 'ステップ①', 'numeric', '129', '通り', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', 'ステップ①', 'numeric', '30', '通り', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'numeric', '660', 'm', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'numeric', '110', 'm', 'A', 7);

  -- 3(1) 2：3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "2", "後": "3"}, "template": "{前}：{後}"}',
    'A', 8);

  -- 3(2) 11/30倍
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ①', 'fraction', '11/30', '倍', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ①', 'numeric', '243', '通り', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ①', 'numeric', '30', '通り', 'A', 11);

  -- 5(1) 1/12倍
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'fraction', '1/12', '倍', 'A', 12);

  -- 5(2) 5/12倍
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'fraction', '5/12', '倍', 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ①', 'numeric', '30', 'km（時速）', 'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ①', 'numeric', '20', '分後', 'A', 15);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(3)', 'ステップ①', 'numeric', '7.5', 'km', 'A', 16);

  -- ============================================================
  -- ステップ② — min_course='B' — 12問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ②', 'numeric', '4.5', 'cm', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ②', 'numeric', '30', 'cm²', 'B', 102);

  -- 2(1) 3：1：2（3項比）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "第1"}, {"label": "第2"}, {"label": "第3"}], "correct_values": {"第1": "3", "第2": "1", "第3": "2"}, "template": "{第1}：{第2}：{第3}"}',
    'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ②', 'numeric', '12.5', 'cm²', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ②', 'numeric', '2', '通り', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ②', 'numeric', '18', '通り', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ②', 'numeric', '10', '通り', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ②', 'numeric', '6', '通り', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(3)', 'ステップ②', 'numeric', '20', '通り', 'B', 109);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5', 'ステップ②', 'numeric', '20.52', 'km', 'B', 110);

  -- 6(1) 8分後，20.8分後（2答）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "1つ目", "unit": "分後"}, {"label": "2つ目", "unit": "分後"}], "correct_values": {"1つ目": "8", "2つ目": "20.8"}, "template": "{1つ目}　{2つ目}"}',
    'B', 111);

  -- 6(2) 34と2/3分後（帯分数）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ②', 'multi_part', NULL,
    '{"slots": [{"label": "整数部"}, {"label": "分子"}, {"label": "分母"}], "correct_values": {"整数部": "34", "分子": "2", "分母": "3"}, "template": "{整数部}と{分子}/{分母}分後"}',
    'B', 112);

  -- ============================================================
  -- ステップ③ — min_course='C' — 6問（2(1)は解説参照）
  -- ============================================================

  -- 1(1) 7：3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "7", "後": "3"}, "template": "{前}：{後}"}',
    'C', 201);

  -- 1(2) 4：3
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'multi_part', NULL,
    '{"slots": [{"label": "前"}, {"label": "後"}], "correct_values": {"前": "4", "後": "3"}, "template": "{前}：{後}"}',
    'C', 202);

  -- 2(1): 解説参照（入力なし・採点なし）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ③', 'note', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ③', 'numeric', '2', '通り', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', 'ステップ③', 'numeric', '7', '通り', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(4)', 'ステップ③', 'numeric', '25', '通り', 'C', 206);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 29
GROUP BY qs.title;
