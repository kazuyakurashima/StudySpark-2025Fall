-- ============================================================================
-- 小5算数 第4回「いろいろな差集め算」演習問題集データ
-- ============================================================================
-- session_id=4 (grade=5, session_number=4), subject_id=1 (算数)
--
-- セクション構成（通常回）:
--   反復問題（基本） → min_course='A' — 14問
--   反復問題（練習） → min_course='B' — 10問
--   実戦演習         → min_course='C' — 8問
--   合計: 32問
--
-- 冪等性: DELETE + INSERT で再投入可能
-- ============================================================================

BEGIN;

DELETE FROM exercise_reflections WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 4 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM student_answers WHERE answer_session_id IN (SELECT ans.id FROM answer_sessions ans JOIN question_sets qs ON ans.question_set_id = qs.id WHERE qs.session_id = 4 AND qs.subject_id = 1 AND qs.grade = 5 AND qs.set_type = 'exercise_workbook' AND qs.edition IS NULL);
DELETE FROM answer_sessions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 4 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM questions WHERE question_set_id IN (SELECT id FROM question_sets WHERE session_id = 4 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL);
DELETE FROM question_sets WHERE session_id = 4 AND subject_id = 1 AND grade = 5 AND set_type = 'exercise_workbook' AND edition IS NULL;

DO $$
DECLARE
  v_qs_id BIGINT;
BEGIN
  INSERT INTO question_sets (session_id, subject_id, grade, set_type, edition, title, display_order, status)
  VALUES (4, 1, 5, 'exercise_workbook', NULL, '小5第4回 算数 演習問題集「いろいろな差集め算」', 1, 'approved')
  RETURNING id INTO v_qs_id;

  -- ============================================================
  -- 反復問題（基本） — min_course='A' — 14問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（基本）', 'numeric', '4', '個', 'A', 1);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（基本）', 'numeric', '120', '円', 'A', 2);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(3)', '反復問題（基本）', 'numeric', '550', '円', 'A', 3);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(4)', '反復問題（基本）', 'numeric', '18', 'cm', 'A', 4);

  -- 1(5) 生徒…24人 消しゴム…90個
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(5)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "生徒"}, {"label": "消しゴム"}], "correct_values": {"生徒": "24", "消しゴム": "90"}, "template": "生徒{生徒}人 消しゴム{消しゴム}個"}',
    'A', 5);

  -- 1(6) 人数…34人 費用…11200円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(6)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "人数"}, {"label": "費用"}], "correct_values": {"人数": "34", "費用": "11200"}, "template": "{人数}人 {費用}円"}',
    'A', 6);

  -- 1(7) 長いす…16脚 生徒…150人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(7)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "長いす"}, {"label": "生徒"}], "correct_values": {"長いす": "16", "生徒": "150"}, "template": "長いす{長いす}脚 生徒{生徒}人"}',
    'A', 7);

  -- 1(8) 参加者…15人 シール…146枚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '1(8)', '反復問題（基本）', 'multi_part', NULL,
    '{"slots": [{"label": "参加者"}, {"label": "シール"}], "correct_values": {"参加者": "15", "シール": "146"}, "template": "参加者{参加者}人 シール{シール}枚"}',
    'A', 8);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(1)', '反復問題（基本）', 'numeric', '49', '人分', 'A', 9);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2(2)', '反復問題（基本）', 'numeric', '103', '人', 'A', 10);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（基本）', 'numeric', '40', 'g', 'A', 11);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（基本）', 'numeric', '240', 'g', 'A', 12);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（基本）', 'numeric', '96', '円', 'A', 13);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（基本）', 'numeric', '1200', '円', 'A', 14);

  -- ============================================================
  -- 反復問題（練習） — min_course='B' — 10問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(1)', '反復問題（練習）', 'numeric', '24', '個', 'B', 101);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1(2)', '反復問題（練習）', 'numeric', '140', '個', 'B', 102);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '2', '反復問題（練習）', 'numeric', '328', 'ページ', 'B', 103);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(1)', '反復問題（練習）', 'numeric', '398', '円', 'B', 104);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '3(2)', '反復問題（練習）', 'numeric', '1100', '円', 'B', 105);

  -- 4(1) ガムの方が20個多い → selection（ガム vs チョコレート）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4(1)', '反復問題（練習）', 'selection', NULL,
    '{"correct_values": ["ガムの方が20個多い"], "dummy_values": ["チョコレートの方が20個多い"]}',
    'B', 106);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '4(2)', '反復問題（練習）', 'numeric', '1540', '円', 'B', 107);

  -- 5(1) サインペンの方が2本多い → selection（サインペン vs けい光ペン）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '反復問題（練習）', 'selection', NULL,
    '{"correct_values": ["サインペンの方が2本多い"], "dummy_values": ["けい光ペンの方が2本多い"]}',
    'B', 108);

  -- 5(2) サインペン…6本 けい光ペン…4本
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "サインペン"}, {"label": "けい光ペン"}], "correct_values": {"サインペン": "6", "けい光ペン": "4"}, "template": "サインペン{サインペン}本 けい光ペン{けい光ペン}本"}',
    'B', 109);

  -- 6 和室…20部屋 洋室…18部屋 人数…150人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6', '反復問題（練習）', 'multi_part', NULL,
    '{"slots": [{"label": "和室"}, {"label": "洋室"}, {"label": "人数"}], "correct_values": {"和室": "20", "洋室": "18", "人数": "150"}, "template": "和室{和室}部屋 洋室{洋室}部屋 {人数}人"}',
    'B', 110);

  -- ============================================================
  -- 実戦演習 — min_course='C' — 8問
  -- ============================================================

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '1', '実戦演習', 'numeric', '950', '円', 'C', 201);

  -- 2 出席者…38人 費用…21000円
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '2', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "出席者"}, {"label": "費用"}], "correct_values": {"出席者": "38", "費用": "21000"}, "template": "出席者{出席者}人 費用{費用}円"}',
    'C', 202);

  -- 3 部屋…36部屋 6年生…243人
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '3', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "部屋"}, {"label": "6年生"}], "correct_values": {"部屋": "36", "6年生": "243"}, "template": "{部屋}部屋 6年生{6年生}人"}',
    'C', 203);

  -- 4 円形のテーブル…23卓 長方形のテーブル…17卓 イス…170脚
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '4', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "円形"}, {"label": "長方形"}, {"label": "イス"}], "correct_values": {"円形": "23", "長方形": "17", "イス": "170"}, "template": "円形テーブル{円形}卓 長方形テーブル{長方形}卓 イス{イス}脚"}',
    'C', 204);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '5(1)', '実戦演習', 'numeric', '18', '本', 'C', 205);

  -- 5(2) えんぴつ…78本 ボールペン…26本
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '5(2)', '実戦演習', 'multi_part', NULL,
    '{"slots": [{"label": "えんぴつ"}, {"label": "ボールペン"}], "correct_values": {"えんぴつ": "78", "ボールペン": "26"}, "template": "えんぴつ{えんぴつ}本 ボールペン{ボールペン}本"}',
    'C', 206);

  -- 6(1) Aの方が7ふくろ多い → selection（A vs B）
  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, answer_config, min_course, display_order)
  VALUES (v_qs_id, '6(1)', '実戦演習', 'selection', NULL,
    '{"correct_values": ["Aの方が7ふくろ多い"], "dummy_values": ["Bの方が7ふくろ多い"]}',
    'C', 207);

  INSERT INTO questions (question_set_id, question_number, section_name, answer_type, correct_answer, unit_label, min_course, display_order)
  VALUES (v_qs_id, '6(2)', '実戦演習', 'numeric', '270', '個', 'C', 208);

END $$;

COMMIT;

SELECT qs.title, COUNT(q.id) as total,
  COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
  COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
  COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
FROM question_sets qs JOIN questions q ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 4
GROUP BY qs.title;

SELECT q.section_name, q.min_course, COUNT(*) as count,
  COUNT(*) FILTER (WHERE q.answer_type = 'numeric') as numeric,
  COUNT(*) FILTER (WHERE q.answer_type = 'multi_part') as multi_part,
  COUNT(*) FILTER (WHERE q.answer_type = 'selection') as selection
FROM questions q JOIN question_sets qs ON q.question_set_id = qs.id
WHERE qs.set_type = 'exercise_workbook' AND qs.session_id = 4
GROUP BY q.section_name, q.min_course ORDER BY q.min_course;
