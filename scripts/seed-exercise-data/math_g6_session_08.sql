-- ============================================================================
-- 小6算数 第8回「場合の数」演習問題集データ
-- ============================================================================
-- session_id=28 (grade=6, session_number=8), subject_id=1 (算数)
--
-- セクション構成（小6通常回）:
--   ステップ① → min_course='A' — 21問
--   ステップ② → min_course='B' — 12問（うち1問は解説参照 answer_type='note'）
--   ステップ③ → min_course='C' —  6問
--   合計: 39問
--
-- 特記:
--   8(1) に vertex_map あり（A=1, B=2, C=3, D=4）。正解は頂点D=4。
--   ステップ② 5 は解説参照（入力なし）。
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
  WHERE qs.session_id = 28 AND qs.subject_id = 1 AND qs.grade = 6
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '生徒回答が % 件存在します。削除前に手動確認してください (session_id=28)', v_count;
  END IF;
END $$;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 28 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 28 AND qs.subject_id = 1 AND qs.grade = 6 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 28 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 28 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 28 AND subject_id = 1 AND grade = 6 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (28, 1, 6, 'exercise_workbook', NULL, '小6第8回 算数 演習問題集「場合の数」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- ステップ① — min_course='A' — 21問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ①', 'numeric', '30', '通り', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ①', 'numeric', '18', '通り', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ①', 'numeric', '100', '通り', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ①', 'numeric', '40', '通り', 'A', 4);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', 'ステップ①', 'numeric', '48', '通り', 'A', 5);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ①', 'numeric', '9', '通り', 'A', 6);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ①', 'numeric', '27', '通り', 'A', 7);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', 'ステップ①', 'numeric', '6', '通り', 'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', 'ステップ①', 'numeric', '12', '通り', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', 'ステップ①', 'numeric', '21', '通り', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', 'ステップ①', 'numeric', '42', '通り', 'A', 11);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(3)', 'ステップ①', 'numeric', '105', '通り', 'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(4)', 'ステップ①', 'numeric', '35', '通り', 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6', 'ステップ①', 'numeric', '5', '通り', 'A', 14);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7(1)', 'ステップ①', 'numeric', '18', '通り', 'A', 15);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '7(2)', 'ステップ①', 'numeric', '36', '通り', 'A', 16);

  -- 8(1) 頂点D → vertex_map: 1=A, 2=B, 3=C, 4=D / 正解: 頂点=4 (頂点D)
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '8(1)', 'ステップ①', 'multi_part', NULL,
    '{"slots": [{"label": "頂点"}], "correct_values": {"頂点": "4"}, "template": "{頂点}", "vertex_map": {"1": "A", "2": "B", "3": "C", "4": "D"}}',
    'A', 17);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '8(2)', 'ステップ①', 'numeric', '8', '通り', 'A', 18);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '9', 'ステップ①', 'numeric', '12', '通り', 'A', 19);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '10(1)', 'ステップ①', 'numeric', '7', '個', 'A', 20);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '10(2)', 'ステップ①', 'numeric', '18', '個', 'A', 21);

  -- ============================================================
  -- ステップ② — min_course='B' — 12問（Q5は解説参照）
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ②', 'numeric', '27', '通り', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ②', 'numeric', '20', '通り', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ②', 'numeric', '81', '通り', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ②', 'numeric', '12', '通り', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', 'ステップ②', 'numeric', '18', '通り', 'B', 105);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(4)', 'ステップ②', 'numeric', '39', '通り', 'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ②', 'numeric', '24', '個', 'B', 107);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ②', 'numeric', '5', '種類', 'B', 108);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4', 'ステップ②', 'numeric', '15', '通り', 'B', 109);

  -- 5: 解説参照（入力なし・採点なし）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, min_course, display_order)
  VALUES (v_qs_id, '5', 'ステップ②', 'note', 'B', 110);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', 'ステップ②', 'numeric', '5', '通り', 'B', 111);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', 'ステップ②', 'numeric', '31', '通り', 'B', 112);

  -- ============================================================
  -- ステップ③ — min_course='C' — 6問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', 'ステップ③', 'numeric', '56', '通り', 'C', 201);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', 'ステップ③', 'numeric', '105', '通り', 'C', 202);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', 'ステップ③', 'numeric', '4', '通り', 'C', 203);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', 'ステップ③', 'numeric', '10', '通り', 'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', 'ステップ③', 'numeric', '7', '通り', 'C', 205);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', 'ステップ③', 'numeric', '274', '通り', 'C', 206);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 28
GROUP BY qs.title;
