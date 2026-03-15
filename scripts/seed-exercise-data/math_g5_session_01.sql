-- ============================================================================
-- 小5算数 第1回「倍数と約数の利用」演習問題集データ
-- ============================================================================
-- Phase 1A パイロットデータ（D-1）
-- session_id=1 (grade=5, session_number=1), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' (全コース) — 17問
--   反復問題（練習） → min_course='B' (B/C/S)   — 12問
--   実戦演習         → min_course='C' (C/S)      — 10問
--   合計: 39問
--
-- answer_type:
--   numeric    = 単一数値 (27問)
--   multi_part = 複数欄（最大公約数/最小公倍数、ア/イ/ウ/エ 等）(12問)
--
-- 「すべて答えなさい」型: multi_part で昇順固定（UIに「小さい順に」注記）
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------
-- 既存データを削除（再投入対応）
-- ------------------------------------------------------------
DELETE FROM student_answers
WHERE answer_session_id IN (
  SELECT ans.id FROM answer_sessions ans
  JOIN question_sets qs ON ans.question_set_id = qs.id
  WHERE qs.session_id = 1 AND qs.subject_id = 1 AND qs.grade = 5
    AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL
);

DELETE FROM answer_sessions
WHERE question_set_id IN (
  SELECT id FROM question_sets
  WHERE session_id = 1 AND subject_id = 1 AND grade = 5
    AND set_type = 'exercise_workbook' AND edition IS NULL
);

DELETE FROM questions
WHERE question_set_id IN (
  SELECT id FROM question_sets
  WHERE session_id = 1 AND subject_id = 1 AND grade = 5
    AND set_type = 'exercise_workbook' AND edition IS NULL
);

DELETE FROM question_sets
WHERE session_id = 1 AND subject_id = 1 AND grade = 5
  AND set_type = 'exercise_workbook' AND edition IS NULL;

-- ------------------------------------------------------------
-- question_set: 小5第1回 算数 演習問題集
-- INSERT ... RETURNING id で確定IDを使用
-- ------------------------------------------------------------
DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (
    session_id, subject_id, grade, set_type, edition, title, display_order, status
  ) VALUES (
    1, 1, 5, 'exercise_workbook', NULL,
    '小5第1回 算数 演習問題集「倍数と約数の利用」',
    1, 'approved'
  ) RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 17問
  -- ============================================================

  -- 1(1) 12個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '12', '個', 'A', 1);

  -- 1(2) 8、14、28、56 ※すべて求めなさい → multi_part 昇順4欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "①"}, {"label": "②"}, {"label": "③"}, {"label": "④"}], "correct_values": {"①": "8", "②": "14", "③": "28", "④": "56"}, "template": "{①}, {②}, {③}, {④}"}',
    NULL, 'A', 2);

  -- 1(3) 195
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '195', NULL, 'A', 3);

  -- 1(4) 67個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '67', '個', 'A', 4);

  -- 1(5)① 最大公約数…2　最小公倍数…180
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(5)①', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "最大公約数"}, {"label": "最小公倍数"}], "correct_values": {"最大公約数": "2", "最小公倍数": "180"}, "template": "最大公約数{最大公約数}, 最小公倍数{最小公倍数}"}',
    'A', 5);

  -- 1(5)② 最大公約数…16　最小公倍数…96
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(5)②', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "最大公約数"}, {"label": "最小公倍数"}], "correct_values": {"最大公約数": "16", "最小公倍数": "96"}, "template": "最大公約数{最大公約数}, 最小公倍数{最小公倍数}"}',
    'A', 6);

  -- 1(5)③ 最大公約数…4　最小公倍数…144
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(5)③', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "最大公約数"}, {"label": "最小公倍数"}], "correct_values": {"最大公約数": "4", "最小公倍数": "144"}, "template": "最大公約数{最大公約数}, 最小公倍数{最小公倍数}"}',
    'A', 7);

  -- 1(6) 12個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(6)', '反復問題（基本）', 'numeric', '12', '個', 'A', 8);

  -- 1(7) 263
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(7)', '反復問題（基本）', 'numeric', '263', NULL, 'A', 9);

  -- 1(8) 22、42、62 ※小さい順に3つ → multi_part 3欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(8)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "1番目"}, {"label": "2番目"}, {"label": "3番目"}], "correct_values": {"1番目": "22", "2番目": "42", "3番目": "62"}, "template": "{1番目}, {2番目}, {3番目}"}',
    NULL, 'A', 10);

  -- 2(1) 4枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '4', '枚', 'A', 11);

  -- 2(2) 9人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '9', '人', 'A', 12);

  -- 3(1)① 45秒後
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)①', '反復問題（基本）', 'numeric', '45', '秒後', 'A', 13);

  -- 3(1)② 135秒後
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)②', '反復問題（基本）', 'numeric', '135', '秒後', 'A', 14);

  -- 3(2) 7回
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '7', '回', 'A', 15);

  -- 4(1) 23
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '23', NULL, 'A', 16);

  -- 4(2) 163
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '163', NULL, 'A', 17);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 12問
  -- ============================================================

  -- 1(1) 833個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '833', '個', 'B', 101);

  -- 1(2) 22個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'numeric', '22', '個', 'B', 102);

  -- 2(1) 142
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（練習）', 'numeric', '142', NULL, 'B', 103);

  -- 2(2) 982
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（練習）', 'numeric', '982', NULL, 'B', 104);

  -- 3(1) 12人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '12', '人', 'B', 105);

  -- 3(2) 13人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '13', '人', 'B', 106);

  -- 4(1) ア…83 イ…27 ウ…20 エ…3 → multi_part 4欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "ア"}, {"label": "イ"}, {"label": "ウ"}, {"label": "エ"}], "correct_values": {"ア": "83", "イ": "27", "ウ": "20", "エ": "3"}, "template": "ア{ア} イ{イ} ウ{ウ} エ{エ}"}',
    'B', 107);

  -- 4(2) オ…424 → numeric（単一値）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（練習）', 'numeric', '424', NULL, 'B', 108);

  -- 5(1) 25枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '反復問題（練習）', 'numeric', '25', '枚', 'B', 109);

  -- 5(2) 50分8秒後、83枚 → multi_part 3欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "分", "unit": "分"}, {"label": "秒", "unit": "秒後"}, {"label": "枚数", "unit": "枚"}], "correct_values": {"分": "50", "秒": "8", "枚数": "83"}, "template": "{分}分{秒}秒後, {枚数}枚"}',
    'B', 110);

  -- 6(1) 午後4時30分 → multi_part 2欄（午後は問題文に含まれる）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "時", "unit": "時"}, {"label": "分", "unit": "分"}], "correct_values": {"時": "4", "分": "30"}, "template": "午後{時}時{分}分"}',
    'B', 111);

  -- 6(2) 午後7時6分 → multi_part 2欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "時", "unit": "時"}, {"label": "分", "unit": "分"}], "correct_values": {"時": "7", "分": "6"}, "template": "午後{時}時{分}分"}',
    'B', 112);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 10問
  -- ============================================================

  -- 1(1) 47枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '実戦演習', 'numeric', '47', '枚', 'C', 201);

  -- 1(2) 24人、48人 ※すべて答えなさい → multi_part 昇順2欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "人"}], "correct_values": {"①": "24", "②": "48"}, "template": "{①}人, {②}人"}',
    NULL, 'C', 202);

  -- 1(3) 4人、20人 ※すべて答えなさい → multi_part 昇順2欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "人"}], "correct_values": {"①": "4", "②": "20"}, "template": "{①}人, {②}人"}',
    NULL, 'C', 203);

  -- 2(1) 159
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '実戦演習', 'numeric', '159', NULL, 'C', 204);

  -- 2(2) 164人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '実戦演習', 'numeric', '164', '人', 'C', 205);

  -- 3(1) 23枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '実戦演習', 'numeric', '23', '枚', 'C', 206);

  -- 3(2) 18分40秒後 → multi_part 2欄
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "分", "unit": "分"}, {"label": "秒", "unit": "秒後"}], "correct_values": {"分": "18", "秒": "40"}, "template": "{分}分{秒}秒後"}',
    'C', 207);

  -- 3(3) 12枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(3)', '実戦演習', 'numeric', '12', '枚', 'C', 208);

  -- 4(1) 153cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '実戦演習', 'numeric', '153', 'cm', 'C', 209);

  -- 4(2) 373cm
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '実戦演習', 'numeric', '373', 'cm', 'C', 210);

END $$;

COMMIT;

-- ============================================================
-- 検証クエリ
-- ============================================================
-- 投入確認
SELECT qs.title, qs.set_type,
  COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs
JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook'
GROUP BY qs.title, qs.set_type;

-- セクション別確認
SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric_count,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part_count
FROM questions q
JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook'
GROUP BY q.section_name, q.min_course
ORDER BY q.min_course, q.section_name;
