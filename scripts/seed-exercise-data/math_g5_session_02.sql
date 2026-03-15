-- ============================================================================
-- 小5算数 第2回「いろいろな図形の面積」演習問題集データ
-- ============================================================================
-- Phase 1A パイロットデータ（D-2）
-- session_id=2 (grade=5, session_number=2), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' (全コース) — 16問
--   反復問題（練習） → min_course='B' (B/C/S)   — 10問
--   実戦演習         → min_course='C' (C/S)      — 11問
--   合計: 37問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

-- 既存データを削除（再投入対応）
DELETE FROM exercise_reflections
WHERE answer_session_id IN (
  SELECT ans.id FROM answer_sessions ans
  JOIN question_sets qs ON ans.question_set_id = qs.id
  WHERE qs.session_id = 2 AND qs.subject_id = 1 AND qs.grade = 5
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL
);

DELETE FROM student_answers
WHERE answer_session_id IN (
  SELECT ans.id FROM answer_sessions ans
  JOIN question_sets qs ON ans.question_set_id = qs.id
  WHERE qs.session_id = 2 AND qs.subject_id = 1 AND qs.grade = 5
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL
);

DELETE FROM answer_sessions
WHERE question_set_id IN (
  SELECT id FROM question_sets
  WHERE session_id = 2 AND subject_id = 1 AND grade = 5
    AND set_type = 'exercise_workbook' AND edition IS NULL
);

DELETE FROM questions
WHERE question_set_id IN (
  SELECT id FROM question_sets
  WHERE session_id = 2 AND subject_id = 1 AND grade = 5
    AND set_type = 'exercise_workbook' AND edition IS NULL
);

DELETE FROM question_sets
WHERE session_id = 2 AND subject_id = 1 AND grade = 5
  AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (
    session_id, subject_id, grade, set_type, edition, title, display_order, status
  ) VALUES (
    2, 1, 5, 'exercise_workbook', NULL,
    '小5第2回 算数 演習問題集「いろいろな図形の面積」',
    1, 'approved'
  ) RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 16問
  -- ============================================================

  -- 1(1) 49.5cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '49.5', 'cm²', 'A', 1);

  -- 1(2) 160cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '160', 'cm²', 'A', 2);

  -- 1(3) 46cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '46', 'cm²', 'A', 3);

  -- 1(4) 18cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '18', 'cm²', 'A', 4);

  -- 1(5) 77cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'numeric', '77', 'cm²', 'A', 5);

  -- 1(6) 36cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(6)', '反復問題（基本）', 'numeric', '36', 'cm²', 'A', 6);

  -- 1(7) 94.2cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(7)', '反復問題（基本）', 'numeric', '94.2', 'cm²', 'A', 7);

  -- 1(8) 7.74cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(8)', '反復問題（基本）', 'numeric', '7.74', 'cm²', 'A', 8);

  -- 1(9) 50cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(9)', '反復問題（基本）', 'numeric', '50', 'cm²', 'A', 9);

  -- 2(1) 4cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '4', 'cm', 'A', 10);

  -- 2(2) 32cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '32', 'cm²', 'A', 11);

  -- 2(3) 4cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(3)', '反復問題（基本）', 'numeric', '4', 'cm', 'A', 12);

  -- 3(1) 三角形CFD ※合同な三角形を選ぶ → selection型
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'selection', NULL,
    '{"correct_values": ["三角形CFD"], "dummy_values": ["三角形CDF", "三角形DCF", "三角形DFC", "三角形FCD", "三角形FDC"]}',
    'A', 13);

  -- 3(2) 42度
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '42', '度', 'A', 14);

  -- 4(1) 72cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '72', 'cm²', 'A', 15);

  -- 4(2) 56.52cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '56.52', 'cm²', 'A', 16);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 10問
  -- ============================================================

  -- 1(1) 20cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '20', 'cm', 'B', 101);

  -- 1(2) 13cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'numeric', '13', 'cm', 'B', 102);

  -- 2(1) 40cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '40', 'cm²', 'B', 103);

  -- 2(2) 8.6cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'numeric', '8.6', 'cm²', 'B', 104);

  -- 3 66cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3', '反復問題（練習）', 'numeric', '66', 'cm²', 'B', 105);

  -- 4 ア34度 イ106度 ウ60度 → multi_part 3欄（数値のみ入力、テンプレートが度を表示）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}, {"label": "ウ"}], "correct_values": {"ア": "34", "イ": "106", "ウ": "60"}, "template": "ア{ア}度 イ{イ}度 ウ{ウ}度"}',
    'B', 106);

  -- 5(図1) 5.13cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(図1)', '反復問題（練習）', 'numeric', '5.13', 'cm²', 'B', 107);

  -- 5(図2) 18.84cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(図2)', '反復問題（練習）', 'numeric', '18.84', 'cm²', 'B', 108);

  -- 6(1) 50cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '反復問題（練習）', 'numeric', '50', 'cm²', 'B', 109);

  -- 6(2) 60.5cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '反復問題（練習）', 'numeric', '60.5', 'cm²', 'B', 110);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 11問
  -- ============================================================

  -- 1(1) 110cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '実戦演習', 'numeric', '110', 'cm²', 'C', 201);

  -- 1(2) 4cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '実戦演習', 'numeric', '4', 'cm', 'C', 202);

  -- 2 2.3cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', '実戦演習', 'numeric', '2.3', 'cm²', 'C', 203);

  -- 3(1) 24cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '実戦演習', 'numeric', '24', 'cm²', 'C', 204);

  -- 3(2) 50cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '実戦演習', 'numeric', '50', 'cm²', 'C', 205);

  -- 4(1) 1.8cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '実戦演習', 'numeric', '1.8', 'cm', 'C', 206);

  -- 4(2) 6.2cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '実戦演習', 'numeric', '6.2', 'cm', 'C', 207);

  -- 5(1) 35.7cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '実戦演習', 'numeric', '35.7', 'cm', 'C', 208);

  -- 5(2) 23.5cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '実戦演習', 'numeric', '23.5', 'cm²', 'C', 209);

  -- 6(1) 113.04cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '実戦演習', 'numeric', '113.04', 'cm²', 'C', 210);

  -- 6(2) 0.84cm²
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '実戦演習', 'numeric', '0.84', 'cm²', 'C', 211);

END $$;

COMMIT;

-- ============================================================
-- 検証クエリ
-- ============================================================
SELECT qs.title, qs.set_type,
  COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs
JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 2
GROUP BY qs.title, qs.set_type;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric_count,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part_count,
  COUNT(*) FILTER (WHERE q.answer_type = 'selection') as selection_count
FROM questions q
JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 2
GROUP BY q.section_name, q.min_course
ORDER BY q.min_course, q.section_name;
