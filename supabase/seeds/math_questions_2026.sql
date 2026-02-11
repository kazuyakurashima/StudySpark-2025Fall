-- ============================================================================
-- 算数自動採点 — 本番問題データ (458問)
-- ============================================================================
-- 生成元: scripts/generate-math-questions-sql.py
-- 再生成: python3 scripts/generate-math-questions-sql.py > supabase/seeds/math_questions_2026.sql
--
-- 内容:
--   小5上 第1回〜第4回 (①②×4 = 8セット, 281問)
--   小6上 第1回〜第4回 (①②×4 = 8セット, 177問)
--   fraction 型: 0問 (今後追加可能)
--
-- 注意: approved済みセットはスキップ、draft は approved に昇格して再投入

DO $$
DECLARE
  v_math_id         BIGINT;
  v_sid             BIGINT;
  v_qs              BIGINT;
  v_count           INTEGER := 0;
  v_existing_id     BIGINT;
  v_existing_status VARCHAR(20);
BEGIN

  -- 算数の subject_id を取得
  SELECT id INTO STRICT v_math_id
  FROM public.subjects WHERE name = '算数';

  -- ========================================
  -- 小5 第1回① 倍数と約数の利用 (40問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 1;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第1回① 倍数と約数の利用（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第1回① 倍数と約数の利用', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第1回① 倍数と約数の利用';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第1回① 倍数と約数の利用', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '11', '個', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '10', '個', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '12', '個', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '12', '個', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '33', '個', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '12', '個', NULL, 1, 6),
    (v_qs, '(7)', '類題1', 'numeric', '28', '個', NULL, 1, 7),
    (v_qs, '(8)', '類題1', 'numeric', '12', '個', NULL, 1, 8),
    (v_qs, '(9)', '類題1', 'numeric', '16', '個', NULL, 1, 9),
    (v_qs, '(10)', '類題1', 'numeric', '9', '個', NULL, 1, 10),
    (v_qs, '(1)', '類題2', 'selection', NULL, NULL, '{"correct_values": ["5", "6", "10", "15", "30"], "dummy_values": ["4", "8", "12", "20", "25"]}', 1, 11),
    (v_qs, '(2)', '類題2', 'selection', NULL, NULL, '{"correct_values": ["9", "12", "18", "36"], "dummy_values": ["6", "15", "24", "30"]}', 1, 12),
    (v_qs, '(3)', '類題2', 'selection', NULL, NULL, '{"correct_values": ["7", "14", "21", "42"], "dummy_values": ["6", "12", "28", "35"]}', 1, 13),
    (v_qs, '(4)', '類題2', 'selection', NULL, NULL, '{"correct_values": ["16", "32"], "dummy_values": ["8", "24", "48"]}', 1, 14),
    (v_qs, '(5)', '類題2', 'selection', NULL, NULL, '{"correct_values": ["12", "18", "36"], "dummy_values": ["9", "15", "24"]}', 1, 15),
    (v_qs, '(1)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}], "correct_values": {"①": "180", "②": "1020"}, "template": "①{①}，②{②}"}', 1, 16),
    (v_qs, '(2)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}], "correct_values": {"①": "360", "②": "990"}, "template": "①{①}，②{②}"}', 1, 17),
    (v_qs, '(3)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}], "correct_values": {"①": "240", "②": "2016"}, "template": "①{①}，②{②}"}', 1, 18),
    (v_qs, '(4)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}], "correct_values": {"①": "900", "②": "1980"}, "template": "①{①}，②{②}"}', 1, 19),
    (v_qs, '(5)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}], "correct_values": {"①": "840", "②": "560"}, "template": "①{①}，②{②}"}', 1, 20),
    (v_qs, '(1)', '計算練習', 'numeric', '72', NULL, NULL, 1, 21),
    (v_qs, '(2)', '計算練習', 'numeric', '70', NULL, NULL, 1, 22),
    (v_qs, '(3)', '計算練習', 'numeric', '120', NULL, NULL, 1, 23),
    (v_qs, '(4)', '計算練習', 'numeric', '64', NULL, NULL, 1, 24),
    (v_qs, '(5)', '計算練習', 'numeric', '108', NULL, NULL, 1, 25),
    (v_qs, '(6)', '計算練習', 'numeric', '105', NULL, NULL, 1, 26),
    (v_qs, '(7)', '計算練習', 'numeric', '72', NULL, NULL, 1, 27),
    (v_qs, '(8)', '計算練習', 'numeric', '108', NULL, NULL, 1, 28),
    (v_qs, '(9)', '計算練習', 'numeric', '84', NULL, NULL, 1, 29),
    (v_qs, '(10)', '計算練習', 'numeric', '75', NULL, NULL, 1, 30),
    (v_qs, '(11)', '計算練習', 'numeric', '128', NULL, NULL, 1, 31),
    (v_qs, '(12)', '計算練習', 'numeric', '144', NULL, NULL, 1, 32),
    (v_qs, '(13)', '計算練習', 'numeric', '96', NULL, NULL, 1, 33),
    (v_qs, '(14)', '計算練習', 'numeric', '125', NULL, NULL, 1, 34),
    (v_qs, '(15)', '計算練習', 'numeric', '84', NULL, NULL, 1, 35),
    (v_qs, '(16)', '計算練習', 'numeric', '128', NULL, NULL, 1, 36),
    (v_qs, '(17)', '計算練習', 'numeric', '180', NULL, NULL, 1, 37),
    (v_qs, '(18)', '計算練習', 'numeric', '84', NULL, NULL, 1, 38),
    (v_qs, '(19)', '計算練習', 'numeric', '126', NULL, NULL, 1, 39),
    (v_qs, '(20)', '計算練習', 'numeric', '105', NULL, NULL, 1, 40);

    v_count := v_count + 40;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第1回② 倍数と約数の利用 (35問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 1;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第1回② 倍数と約数の利用（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第1回② 倍数と約数の利用', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第1回② 倍数と約数の利用';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第1回② 倍数と約数の利用', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題（基本問題１(8)）', 'selection', NULL, NULL, '{"correct_values": ["32", "62", "92"], "dummy_values": ["22", "52", "82"]}', 1, 1),
    (v_qs, '(2)', '類題（基本問題１(8)）', 'selection', NULL, NULL, '{"correct_values": ["13", "25", "37"], "dummy_values": ["7", "19", "43"]}', 1, 2),
    (v_qs, '(3)', '類題（基本問題１(8)）', 'selection', NULL, NULL, '{"correct_values": ["17", "32", "47"], "dummy_values": ["7", "22", "52"]}', 1, 3),
    (v_qs, '(4)', '類題（基本問題１(8)）', 'selection', NULL, NULL, '{"correct_values": ["21", "39", "57"], "dummy_values": ["15", "33", "51"]}', 1, 4),
    (v_qs, '(5)', '類題（基本問題１(8)）', 'selection', NULL, NULL, '{"correct_values": ["25", "49", "73"], "dummy_values": ["19", "43", "67"]}', 1, 5),
    (v_qs, '(1)', '類題5', 'selection', NULL, NULL, '{"correct_values": ["29", "59", "89"], "dummy_values": ["19", "49", "99"]}', 1, 6),
    (v_qs, '(2)', '類題5', 'selection', NULL, NULL, '{"correct_values": ["17", "35", "53"], "dummy_values": ["11", "23", "47"]}', 1, 7),
    (v_qs, '(3)', '類題5', 'selection', NULL, NULL, '{"correct_values": ["22", "46", "70"], "dummy_values": ["10", "34", "58"]}', 1, 8),
    (v_qs, '(4)', '類題5', 'selection', NULL, NULL, '{"correct_values": ["33", "68", "103"], "dummy_values": ["23", "53", "88"]}', 1, 9),
    (v_qs, '(5)', '類題5', 'selection', NULL, NULL, '{"correct_values": ["35", "71", "107"], "dummy_values": ["17", "53", "89"]}', 1, 10),
    (v_qs, '(1)', '類題7', 'numeric', '20', '個', NULL, 1, 11),
    (v_qs, '(2)', '類題7', 'numeric', '7', '個', NULL, 1, 12),
    (v_qs, '(3)', '類題7', 'numeric', '17', '個', NULL, 1, 13),
    (v_qs, '(4)', '類題7', 'numeric', '33', '個', NULL, 1, 14),
    (v_qs, '(5)', '類題7', 'numeric', '34', '個', NULL, 1, 15),
    (v_qs, '(1)', '計算練習', 'numeric', '12', NULL, NULL, 1, 16),
    (v_qs, '(2)', '計算練習', 'numeric', '14', NULL, NULL, 1, 17),
    (v_qs, '(3)', '計算練習', 'numeric', '24', NULL, NULL, 1, 18),
    (v_qs, '(4)', '計算練習', 'numeric', '12', NULL, NULL, 1, 19),
    (v_qs, '(5)', '計算練習', 'numeric', '12', NULL, NULL, 1, 20),
    (v_qs, '(6)', '計算練習', 'numeric', '18', NULL, NULL, 1, 21),
    (v_qs, '(7)', '計算練習', 'numeric', '24', NULL, NULL, 1, 22),
    (v_qs, '(8)', '計算練習', 'numeric', '42', NULL, NULL, 1, 23),
    (v_qs, '(9)', '計算練習', 'numeric', '25', NULL, NULL, 1, 24),
    (v_qs, '(10)', '計算練習', 'numeric', '18', NULL, NULL, 1, 25),
    (v_qs, '(11)', '計算練習', 'numeric', '4', NULL, NULL, 1, 26),
    (v_qs, '(12)', '計算練習', 'numeric', '4', NULL, NULL, 1, 27),
    (v_qs, '(13)', '計算練習', 'numeric', '5', NULL, NULL, 1, 28),
    (v_qs, '(14)', '計算練習', 'numeric', '4', NULL, NULL, 1, 29),
    (v_qs, '(15)', '計算練習', 'numeric', '8', NULL, NULL, 1, 30),
    (v_qs, '(16)', '計算練習', 'numeric', '9', NULL, NULL, 1, 31),
    (v_qs, '(17)', '計算練習', 'numeric', '3', NULL, NULL, 1, 32),
    (v_qs, '(18)', '計算練習', 'numeric', '5', NULL, NULL, 1, 33),
    (v_qs, '(19)', '計算練習', 'numeric', '3', NULL, NULL, 1, 34),
    (v_qs, '(20)', '計算練習', 'numeric', '5', NULL, NULL, 1, 35);

    v_count := v_count + 35;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第2回① いろいろな図形の面積 (38問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 2;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第2回① いろいろな図形の面積（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第2回① いろいろな図形の面積', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第2回① いろいろな図形の面積';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第2回① いろいろな図形の面積', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '17', '㎠', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '19', '㎠', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '36.5', '㎠', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '80', '㎠', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '53', '㎠', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '33', '㎠', NULL, 1, 6),
    (v_qs, '(7)', '類題1', 'numeric', '14', '㎠', NULL, 1, 7),
    (v_qs, '(8)', '類題1', 'numeric', '18', '㎠', NULL, 1, 8),
    (v_qs, '(9)', '類題1', 'numeric', '49', '㎠', NULL, 1, 9),
    (v_qs, '(1)', '類題2', 'numeric', '36.48', '㎠', NULL, 1, 10),
    (v_qs, '(2)', '類題2', 'numeric', '16', '㎠', NULL, 1, 11),
    (v_qs, '(3)', '類題2', 'numeric', '4.71', '㎠', NULL, 1, 12),
    (v_qs, '(4)', '類題2', 'numeric', '20.56', '㎠', NULL, 1, 13),
    (v_qs, '(5)', '類題2', 'numeric', '18.24', '㎠', NULL, 1, 14),
    (v_qs, '(6)', '類題2', 'numeric', '57', '㎠', NULL, 1, 15),
    (v_qs, '(7)', '類題2', 'numeric', '25.12', '㎠', NULL, 1, 16),
    (v_qs, '(8)', '類題2', 'numeric', '9.12', '㎠', NULL, 1, 17),
    (v_qs, '(9)', '類題2', 'numeric', '20.52', '㎠', NULL, 1, 18),
    (v_qs, '(1)', '計算練習', 'numeric', '3.14', NULL, NULL, 1, 19),
    (v_qs, '(2)', '計算練習', 'numeric', '6.28', NULL, NULL, 1, 20),
    (v_qs, '(3)', '計算練習', 'numeric', '9.42', NULL, NULL, 1, 21),
    (v_qs, '(4)', '計算練習', 'numeric', '12.56', NULL, NULL, 1, 22),
    (v_qs, '(5)', '計算練習', 'numeric', '15.7', NULL, NULL, 1, 23),
    (v_qs, '(6)', '計算練習', 'numeric', '18.84', NULL, NULL, 1, 24),
    (v_qs, '(7)', '計算練習', 'numeric', '21.98', NULL, NULL, 1, 25),
    (v_qs, '(8)', '計算練習', 'numeric', '25.12', NULL, NULL, 1, 26),
    (v_qs, '(9)', '計算練習', 'numeric', '28.26', NULL, NULL, 1, 27),
    (v_qs, '(10)', '計算練習', 'numeric', '31.4', NULL, NULL, 1, 28),
    (v_qs, '(11)', '計算練習', 'numeric', '72', NULL, NULL, 1, 29),
    (v_qs, '(12)', '計算練習', 'numeric', '125', NULL, NULL, 1, 30),
    (v_qs, '(13)', '計算練習', 'numeric', '84', NULL, NULL, 1, 31),
    (v_qs, '(14)', '計算練習', 'numeric', '192', NULL, NULL, 1, 32),
    (v_qs, '(15)', '計算練習', 'numeric', '140', NULL, NULL, 1, 33),
    (v_qs, '(16)', '計算練習', 'numeric', '216', NULL, NULL, 1, 34),
    (v_qs, '(17)', '計算練習', 'numeric', '144', NULL, NULL, 1, 35),
    (v_qs, '(18)', '計算練習', 'numeric', '120', NULL, NULL, 1, 36),
    (v_qs, '(19)', '計算練習', 'numeric', '150', NULL, NULL, 1, 37),
    (v_qs, '(20)', '計算練習', 'numeric', '140', NULL, NULL, 1, 38);

    v_count := v_count + 38;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第2回② いろいろな図形の面積 (38問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 2;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第2回② いろいろな図形の面積（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第2回② いろいろな図形の面積', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第2回② いろいろな図形の面積';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第2回② いろいろな図形の面積', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '50.24', '㎠', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '28.26', '㎠', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '4.71', '㎠', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '9.42', '㎠', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '34', '㎠', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '18.84', '㎠', NULL, 1, 6),
    (v_qs, '(7)', '類題1', 'numeric', '4.71', '㎠', NULL, 1, 7),
    (v_qs, '(8)', '類題1', 'numeric', '4', '㎝', NULL, 1, 8),
    (v_qs, '(1)', '計算練習', 'numeric', '96', NULL, NULL, 1, 9),
    (v_qs, '(2)', '計算練習', 'numeric', '90', NULL, NULL, 1, 10),
    (v_qs, '(3)', '計算練習', 'numeric', '64', NULL, NULL, 1, 11),
    (v_qs, '(4)', '計算練習', 'numeric', '70', NULL, NULL, 1, 12),
    (v_qs, '(5)', '計算練習', 'numeric', '54', NULL, NULL, 1, 13),
    (v_qs, '(6)', '計算練習', 'numeric', '76', NULL, NULL, 1, 14),
    (v_qs, '(7)', '計算練習', 'numeric', '65', NULL, NULL, 1, 15),
    (v_qs, '(8)', '計算練習', 'numeric', '51', NULL, NULL, 1, 16),
    (v_qs, '(9)', '計算練習', 'numeric', '72', NULL, NULL, 1, 17),
    (v_qs, '(10)', '計算練習', 'numeric', '75', NULL, NULL, 1, 18),
    (v_qs, '(11)', '計算練習', 'numeric', '3.14', NULL, NULL, 1, 19),
    (v_qs, '(12)', '計算練習', 'numeric', '6.28', NULL, NULL, 1, 20),
    (v_qs, '(13)', '計算練習', 'numeric', '9.42', NULL, NULL, 1, 21),
    (v_qs, '(14)', '計算練習', 'numeric', '12.56', NULL, NULL, 1, 22),
    (v_qs, '(15)', '計算練習', 'numeric', '15.7', NULL, NULL, 1, 23),
    (v_qs, '(16)', '計算練習', 'numeric', '18.84', NULL, NULL, 1, 24),
    (v_qs, '(17)', '計算練習', 'numeric', '21.98', NULL, NULL, 1, 25),
    (v_qs, '(18)', '計算練習', 'numeric', '25.12', NULL, NULL, 1, 26),
    (v_qs, '(19)', '計算練習', 'numeric', '28.26', NULL, NULL, 1, 27),
    (v_qs, '(20)', '計算練習', 'numeric', '31.4', NULL, NULL, 1, 28),
    (v_qs, '(21)', '計算練習', 'numeric', '37.68', NULL, NULL, 1, 29),
    (v_qs, '(22)', '計算練習', 'numeric', '43.96', NULL, NULL, 1, 30),
    (v_qs, '(23)', '計算練習', 'numeric', '50.24', NULL, NULL, 1, 31),
    (v_qs, '(24)', '計算練習', 'numeric', '56.52', NULL, NULL, 1, 32),
    (v_qs, '(25)', '計算練習', 'numeric', '62.8', NULL, NULL, 1, 33),
    (v_qs, '(26)', '計算練習', 'numeric', '75.36', NULL, NULL, 1, 34),
    (v_qs, '(27)', '計算練習', 'numeric', '100.48', NULL, NULL, 1, 35),
    (v_qs, '(28)', '計算練習', 'numeric', '113.04', NULL, NULL, 1, 36),
    (v_qs, '(29)', '計算練習', 'numeric', '150.72', NULL, NULL, 1, 37),
    (v_qs, '(30)', '計算練習', 'numeric', '200.96', NULL, NULL, 1, 38);

    v_count := v_count + 38;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第3回① 割合の利用 (38問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 3;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第3回① 割合の利用（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第3回① 割合の利用', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第3回① 割合の利用';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第3回① 割合の利用', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '25', '％', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '360', 'mL', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '2000', '円', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '64', '％', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '320', 'g', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '600', '円', NULL, 1, 6),
    (v_qs, '(1)', '類題2', 'numeric', '140', 'ページ', NULL, 1, 7),
    (v_qs, '(2)', '類題2', 'numeric', '150', '問', NULL, 1, 8),
    (v_qs, '(3)', '類題2', 'numeric', '330', 'ページ', NULL, 1, 9),
    (v_qs, '(4)', '類題2', 'numeric', '50', '問', NULL, 1, 10),
    (v_qs, '(5)', '類題2', 'numeric', '220', 'ページ', NULL, 1, 11),
    (v_qs, '(6)', '類題2', 'numeric', '60', '問', NULL, 1, 12),
    (v_qs, '(1)', '類題3', 'numeric', '200', '人', NULL, 1, 13),
    (v_qs, '(2)', '類題3', 'numeric', '120', '人', NULL, 1, 14),
    (v_qs, '(3)', '類題3', 'numeric', '180', '人', NULL, 1, 15),
    (v_qs, '(4)', '類題3', 'numeric', '520', '人', NULL, 1, 16),
    (v_qs, '(5)', '類題3', 'numeric', '120', '人', NULL, 1, 17),
    (v_qs, '(6)', '類題3', 'numeric', '300', '人', NULL, 1, 18),
    (v_qs, '(1)', '計算練習', 'numeric', '61', NULL, NULL, 1, 19),
    (v_qs, '(2)', '計算練習', 'numeric', '72', NULL, NULL, 1, 20),
    (v_qs, '(3)', '計算練習', 'numeric', '82', NULL, NULL, 1, 21),
    (v_qs, '(4)', '計算練習', 'numeric', '73', NULL, NULL, 1, 22),
    (v_qs, '(5)', '計算練習', 'numeric', '74', NULL, NULL, 1, 23),
    (v_qs, '(6)', '計算練習', 'numeric', '100', NULL, NULL, 1, 24),
    (v_qs, '(7)', '計算練習', 'numeric', '121', NULL, NULL, 1, 25),
    (v_qs, '(8)', '計算練習', 'numeric', '119', NULL, NULL, 1, 26),
    (v_qs, '(9)', '計算練習', 'numeric', '192', NULL, NULL, 1, 27),
    (v_qs, '(10)', '計算練習', 'numeric', '180', NULL, NULL, 1, 28),
    (v_qs, '(11)', '計算練習', 'numeric', '56', NULL, NULL, 1, 29),
    (v_qs, '(12)', '計算練習', 'numeric', '28', NULL, NULL, 1, 30),
    (v_qs, '(13)', '計算練習', 'numeric', '55', NULL, NULL, 1, 31),
    (v_qs, '(14)', '計算練習', 'numeric', '48', NULL, NULL, 1, 32),
    (v_qs, '(15)', '計算練習', 'numeric', '18', NULL, NULL, 1, 33),
    (v_qs, '(16)', '計算練習', 'numeric', '108', NULL, NULL, 1, 34),
    (v_qs, '(17)', '計算練習', 'numeric', '72', NULL, NULL, 1, 35),
    (v_qs, '(18)', '計算練習', 'numeric', '76', NULL, NULL, 1, 36),
    (v_qs, '(19)', '計算練習', 'numeric', '59', NULL, NULL, 1, 37),
    (v_qs, '(20)', '計算練習', 'numeric', '24', NULL, NULL, 1, 38);

    v_count := v_count + 38;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第3回② 相当算 (28問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 3;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第3回② 相当算（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第3回② 相当算', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第3回② 相当算';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第3回② 相当算', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題4', 'numeric', '120', 'ページ', NULL, 1, 1),
    (v_qs, '(2)', '類題4', 'numeric', '1200', '円', NULL, 1, 2),
    (v_qs, '(3)', '類題4', 'numeric', '6000', '円', NULL, 1, 3),
    (v_qs, '(4)', '類題4', 'numeric', '120', 'ページ', NULL, 1, 4),
    (v_qs, '(5)', '類題4', 'numeric', '5000', '円', NULL, 1, 5),
    (v_qs, '(6)', '類題4', 'numeric', '300', 'ページ', NULL, 1, 6),
    (v_qs, '(7)', '類題4', 'numeric', '185', 'ページ', NULL, 1, 7),
    (v_qs, '(8)', '類題4', 'numeric', '210', 'ページ', NULL, 1, 8),
    (v_qs, '(9)', '類題4', 'numeric', '550', '円', NULL, 1, 9),
    (v_qs, '(10)', '類題4', 'numeric', '2400', '円', NULL, 1, 10),
    (v_qs, '(11)', '類題4', 'numeric', '195', 'ページ', NULL, 1, 11),
    (v_qs, '(12)', '類題4', 'numeric', '975', '円', NULL, 1, 12),
    (v_qs, '(1)', '計算練習', 'numeric', '24', NULL, NULL, 1, 13),
    (v_qs, '(2)', '計算練習', 'numeric', '18', NULL, NULL, 1, 14),
    (v_qs, '(3)', '計算練習', 'numeric', '15', NULL, NULL, 1, 15),
    (v_qs, '(4)', '計算練習', 'numeric', '10', NULL, NULL, 1, 16),
    (v_qs, '(5)', '計算練習', 'numeric', '12', NULL, NULL, 1, 17),
    (v_qs, '(6)', '計算練習', 'numeric', '20', NULL, NULL, 1, 18),
    (v_qs, '(7)', '計算練習', 'numeric', '8', NULL, NULL, 1, 19),
    (v_qs, '(8)', '計算練習', 'numeric', '32', NULL, NULL, 1, 20),
    (v_qs, '(9)', '計算練習', 'numeric', '54', NULL, NULL, 1, 21),
    (v_qs, '(10)', '計算練習', 'numeric', '32', NULL, NULL, 1, 22),
    (v_qs, '(11)', '計算練習', 'numeric', '21', NULL, NULL, 1, 23),
    (v_qs, '(12)', '計算練習', 'numeric', '30', NULL, NULL, 1, 24),
    (v_qs, '(13)', '計算練習', 'numeric', '36', NULL, NULL, 1, 25),
    (v_qs, '(14)', '計算練習', 'numeric', '32', NULL, NULL, 1, 26),
    (v_qs, '(15)', '計算練習', 'numeric', '81', NULL, NULL, 1, 27),
    (v_qs, '(16)', '計算練習', 'numeric', '72', NULL, NULL, 1, 28);

    v_count := v_count + 28;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第4回① 差集め算 (32問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 4;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第4回① 差集め算（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第4回① 差集め算', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第4回① 差集め算';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第4回① 差集め算', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '900', '円', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '2400', '円', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '4050', '円', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '2750', '円', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '3400', '円', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '5250', '円', NULL, 1, 6),
    (v_qs, '(1)', '類題2', 'numeric', '100', '枚', NULL, 1, 7),
    (v_qs, '(2)', '類題2', 'numeric', '33', '個', NULL, 1, 8),
    (v_qs, '(3)', '類題2', 'numeric', '10', '本', NULL, 1, 9),
    (v_qs, '(4)', '類題2', 'numeric', '78', '枚', NULL, 1, 10),
    (v_qs, '(5)', '類題2', 'numeric', '91', '個', NULL, 1, 11),
    (v_qs, '(6)', '類題2', 'numeric', '90', '本', NULL, 1, 12),
    (v_qs, '(1)', '計算練習', 'numeric', '720', NULL, NULL, 1, 13),
    (v_qs, '(2)', '計算練習', 'numeric', '700', NULL, NULL, 1, 14),
    (v_qs, '(3)', '計算練習', 'numeric', '1200', NULL, NULL, 1, 15),
    (v_qs, '(4)', '計算練習', 'numeric', '640', NULL, NULL, 1, 16),
    (v_qs, '(5)', '計算練習', 'numeric', '1080', NULL, NULL, 1, 17),
    (v_qs, '(6)', '計算練習', 'numeric', '1050', NULL, NULL, 1, 18),
    (v_qs, '(7)', '計算練習', 'numeric', '720', NULL, NULL, 1, 19),
    (v_qs, '(8)', '計算練習', 'numeric', '1080', NULL, NULL, 1, 20),
    (v_qs, '(9)', '計算練習', 'numeric', '840', NULL, NULL, 1, 21),
    (v_qs, '(10)', '計算練習', 'numeric', '750', NULL, NULL, 1, 22),
    (v_qs, '(11)', '計算練習', 'numeric', '1280', NULL, NULL, 1, 23),
    (v_qs, '(12)', '計算練習', 'numeric', '1440', NULL, NULL, 1, 24),
    (v_qs, '(13)', '計算練習', 'numeric', '960', NULL, NULL, 1, 25),
    (v_qs, '(14)', '計算練習', 'numeric', '1250', NULL, NULL, 1, 26),
    (v_qs, '(15)', '計算練習', 'numeric', '840', NULL, NULL, 1, 27),
    (v_qs, '(16)', '計算練習', 'numeric', '1280', NULL, NULL, 1, 28),
    (v_qs, '(17)', '計算練習', 'numeric', '1800', NULL, NULL, 1, 29),
    (v_qs, '(18)', '計算練習', 'numeric', '840', NULL, NULL, 1, 30),
    (v_qs, '(19)', '計算練習', 'numeric', '1260', NULL, NULL, 1, 31),
    (v_qs, '(20)', '計算練習', 'numeric', '1050', NULL, NULL, 1, 32);

    v_count := v_count + 32;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小5 第4回② 差集め算 (32問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 5 AND session_number = 4;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小5 第4回② 差集め算（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第4回② 差集め算', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小5 第4回② 差集め算';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 5, '第4回② 差集め算', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "A", "unit": "個"}, {"label": "B", "unit": "個"}], "correct_values": {"A": "14", "B": "11"}, "template": "A{A}個，B{B}個"}', 1, 1),
    (v_qs, '(2)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "A", "unit": "個"}, {"label": "B", "unit": "個"}], "correct_values": {"A": "34", "B": "30"}, "template": "A{A}個，B{B}個"}', 1, 2),
    (v_qs, '(3)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "A", "unit": "個"}, {"label": "B", "unit": "個"}], "correct_values": {"A": "25", "B": "20"}, "template": "A{A}個，B{B}個"}', 1, 3),
    (v_qs, '(4)', '類題3', 'multi_part', NULL, NULL, '{"slots": [{"label": "A", "unit": "個"}, {"label": "B", "unit": "個"}], "correct_values": {"A": "18", "B": "12"}, "template": "A{A}個，B{B}個"}', 1, 4),
    (v_qs, '(1)', '類題4', 'numeric', '1540', '円', NULL, 1, 5),
    (v_qs, '(2)', '類題4', 'numeric', '490', '円', NULL, 1, 6),
    (v_qs, '(3)', '類題4', 'numeric', '510', '円', NULL, 1, 7),
    (v_qs, '(4)', '類題4', 'numeric', '620', '円', NULL, 1, 8),
    (v_qs, '(1)', '類題6', 'multi_part', NULL, NULL, '{"slots": [{"label": "60円切手", "unit": "枚"}, {"label": "90円切手", "unit": "枚"}], "correct_values": {"60円切手": "11", "90円切手": "4"}, "template": "60円切手{60円切手}枚，90円切手{90円切手}枚"}', 1, 9),
    (v_qs, '(2)', '類題6', 'multi_part', NULL, NULL, '{"slots": [{"label": "50円切手", "unit": "枚"}, {"label": "70円切手", "unit": "枚"}], "correct_values": {"50円切手": "11", "70円切手": "8"}, "template": "50円切手{50円切手}枚，70円切手{70円切手}枚"}', 1, 10),
    (v_qs, '(3)', '類題6', 'multi_part', NULL, NULL, '{"slots": [{"label": "100円切手", "unit": "枚"}, {"label": "120円切手", "unit": "枚"}], "correct_values": {"100円切手": "12", "120円切手": "8"}, "template": "100円切手{100円切手}枚，120円切手{120円切手}枚"}', 1, 11),
    (v_qs, '(4)', '類題6', 'multi_part', NULL, NULL, '{"slots": [{"label": "50円切手", "unit": "枚"}, {"label": "80円切手", "unit": "枚"}], "correct_values": {"50円切手": "5", "80円切手": "8"}, "template": "50円切手{50円切手}枚，80円切手{80円切手}枚"}', 1, 12),
    (v_qs, '(1)', '計算練習', 'numeric', '24', NULL, NULL, 1, 13),
    (v_qs, '(2)', '計算練習', 'numeric', '35', NULL, NULL, 1, 14),
    (v_qs, '(3)', '計算練習', 'numeric', '25', NULL, NULL, 1, 15),
    (v_qs, '(4)', '計算練習', 'numeric', '45', NULL, NULL, 1, 16),
    (v_qs, '(5)', '計算練習', 'numeric', '36', NULL, NULL, 1, 17),
    (v_qs, '(6)', '計算練習', 'numeric', '35', NULL, NULL, 1, 18),
    (v_qs, '(7)', '計算練習', 'numeric', '16', NULL, NULL, 1, 19),
    (v_qs, '(8)', '計算練習', 'numeric', '15', NULL, NULL, 1, 20),
    (v_qs, '(9)', '計算練習', 'numeric', '28', NULL, NULL, 1, 21),
    (v_qs, '(10)', '計算練習', 'numeric', '75', NULL, NULL, 1, 22),
    (v_qs, '(11)', '計算練習', 'numeric', '15', NULL, NULL, 1, 23),
    (v_qs, '(12)', '計算練習', 'numeric', '4', NULL, NULL, 1, 24),
    (v_qs, '(13)', '計算練習', 'numeric', '15', NULL, NULL, 1, 25),
    (v_qs, '(14)', '計算練習', 'numeric', '24', NULL, NULL, 1, 26),
    (v_qs, '(15)', '計算練習', 'numeric', '20', NULL, NULL, 1, 27),
    (v_qs, '(16)', '計算練習', 'numeric', '64', NULL, NULL, 1, 28),
    (v_qs, '(17)', '計算練習', 'numeric', '45', NULL, NULL, 1, 29),
    (v_qs, '(18)', '計算練習', 'numeric', '15', NULL, NULL, 1, 30),
    (v_qs, '(19)', '計算練習', 'numeric', '14', NULL, NULL, 1, 31),
    (v_qs, '(20)', '計算練習', 'numeric', '6', NULL, NULL, 1, 32);

    v_count := v_count + 32;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第1回① 文章題 (41問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 1;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第1回① 文章題（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第1回① 文章題', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第1回① 文章題';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第1回① 文章題', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '類題1', 'numeric', '14', '個', NULL, 1, 1),
    (v_qs, '(2)', '類題1', 'numeric', '23', '個', NULL, 1, 2),
    (v_qs, '(3)', '類題1', 'numeric', '15', '人', NULL, 1, 3),
    (v_qs, '(4)', '類題1', 'numeric', '340', '円', NULL, 1, 4),
    (v_qs, '(5)', '類題1', 'numeric', '12', '本', NULL, 1, 5),
    (v_qs, '(6)', '類題1', 'numeric', '25', '本', NULL, 1, 6),
    (v_qs, '(7)', '類題1', 'numeric', '19', '本', NULL, 1, 7),
    (v_qs, '(8)', '類題1', 'numeric', '22', '冊', NULL, 1, 8),
    (v_qs, '(1)', '類題2', 'numeric', '19', '歳', NULL, 1, 9),
    (v_qs, '(2)', '類題2', 'numeric', '16', '歳', NULL, 1, 10),
    (v_qs, '(3)', '類題2', 'numeric', '21', '歳', NULL, 1, 11),
    (v_qs, '(4)', '類題2', 'numeric', '14', '歳', NULL, 1, 12),
    (v_qs, '(5)', '類題2', 'numeric', '17', '歳', NULL, 1, 13),
    (v_qs, '(6)', '類題2', 'numeric', '26', '歳', NULL, 1, 14),
    (v_qs, '(7)', '類題2', 'numeric', '10', '歳', NULL, 1, 15),
    (v_qs, '(8)', '類題2', 'numeric', '12', '歳', NULL, 1, 16),
    (v_qs, '(9)', '類題2', 'numeric', '14', '歳', NULL, 1, 17),
    (v_qs, '(10)', '類題2', 'numeric', '18', '歳', NULL, 1, 18),
    (v_qs, '(1)', '類題3', 'numeric', '2', '班', NULL, 1, 19),
    (v_qs, '(2)', '類題3', 'numeric', '6', '冊', NULL, 1, 20),
    (v_qs, '(3)', '類題3', 'numeric', '4', '本', NULL, 1, 21),
    (v_qs, '(4)', '類題3', 'numeric', '4', '個', NULL, 1, 22),
    (v_qs, '(5)', '類題3', 'numeric', '4', '枚', NULL, 1, 23),
    (v_qs, '(6)', '類題3', 'numeric', '3', '本', NULL, 1, 24),
    (v_qs, '(1)', '類題4', 'numeric', '40', '円', NULL, 1, 25),
    (v_qs, '(2)', '類題4', 'numeric', '150', '円', NULL, 1, 26),
    (v_qs, '(3)', '類題4', 'numeric', '80', '円', NULL, 1, 27),
    (v_qs, '(4)', '類題4', 'numeric', '100', '円', NULL, 1, 28),
    (v_qs, '(5)', '類題4', 'numeric', '200', '円', NULL, 1, 29),
    (v_qs, '(1)', '類題5', 'numeric', '200', '円', NULL, 1, 30),
    (v_qs, '(2)', '類題5', 'numeric', '120', '円', NULL, 1, 31),
    (v_qs, '(3)', '類題5', 'numeric', '600', '円', NULL, 1, 32),
    (v_qs, '(4)', '類題5', 'numeric', '250', '円', NULL, 1, 33),
    (v_qs, '(1)', '類題6', 'numeric', '275', '円', NULL, 1, 34),
    (v_qs, '(2)', '類題6', 'numeric', '130', '円', NULL, 1, 35),
    (v_qs, '(3)', '類題6', 'numeric', '140', '円', NULL, 1, 36),
    (v_qs, '(1)', '類題7', 'numeric', '2', '通り', NULL, 1, 37),
    (v_qs, '(2)', '類題7', 'numeric', '4', '本', NULL, 1, 38),
    (v_qs, '(3)', '類題7', 'numeric', '5', '個', NULL, 1, 39),
    (v_qs, '(4)', '類題7', 'numeric', '6', '個', NULL, 1, 40),
    (v_qs, '(5)', '類題7', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}, {"label": "③", "unit": ""}, {"label": "④", "unit": ""}, {"label": "⑤", "unit": ""}, {"label": "⑥", "unit": ""}, {"label": "⑦", "unit": ""}, {"label": "⑧", "unit": ""}, {"label": "⑨", "unit": ""}], "correct_values": {"①": "4", "②": "8", "③": "12", "④": "16", "⑤": "20", "⑥": "24", "⑦": "28", "⑧": "32", "⑨": "36"}, "template": "①{①}，②{②}，③{③}，④{④}，⑤{⑤}，⑥{⑥}，⑦{⑦}，⑧{⑧}，⑨{⑨}"}', 1, 41);

    v_count := v_count + 41;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第1回② 文章題 (41問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 1;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第1回② 文章題（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第1回② 文章題', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第1回② 文章題';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第1回② 文章題', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '平均算（合計の利用）', 'numeric', '50.9', '点', NULL, 1, 1),
    (v_qs, '(2)', '平均算（合計の利用）', 'numeric', '75', '点', NULL, 1, 2),
    (v_qs, '(3)', '平均算（合計の利用）', 'numeric', '86', '点', NULL, 1, 3),
    (v_qs, '(4)', '平均算（合計の利用）', 'numeric', '75', '点', NULL, 1, 4),
    (v_qs, '(5)', '平均算（合計の利用）', 'numeric', '97', '点', NULL, 1, 5),
    (v_qs, '(6)', '平均算（合計の利用）', 'numeric', '84', '点', NULL, 1, 6),
    (v_qs, '(7)', '平均算（合計の利用）', 'numeric', '96', '点', NULL, 1, 7),
    (v_qs, '(8)', '平均算（合計の利用）', 'numeric', '80', '点', NULL, 1, 8),
    (v_qs, '(9)', '平均算（合計の利用）', 'numeric', '83', '点', NULL, 1, 9),
    (v_qs, '(10)', '平均算（合計の利用）', 'numeric', '8.25', '点', NULL, 1, 10),
    (v_qs, '(11)', '平均算（合計の利用）', 'numeric', '78', '点', NULL, 1, 11),
    (v_qs, '(12)', '平均算（合計の利用）', 'numeric', '78', '点', NULL, 1, 12),
    (v_qs, '(1)', '平均算（面積図）', 'numeric', '9', '回目', NULL, 1, 13),
    (v_qs, '(2)', '平均算（面積図）', 'numeric', '70', '人', NULL, 1, 14),
    (v_qs, '(3)', '平均算（面積図）', 'numeric', '78', '点', NULL, 1, 15),
    (v_qs, '(4)', '平均算（面積図）', 'multi_part', NULL, NULL, '{"slots": [{"label": "A", "unit": "冊"}, {"label": "B", "unit": "冊"}], "correct_values": {"A": "15", "B": "35"}, "template": "A{A}冊，B{B}冊"}', 1, 16),
    (v_qs, '(5)', '平均算（面積図）', 'numeric', '57', '点', NULL, 1, 17),
    (v_qs, '(6)', '平均算（面積図）', 'numeric', '9', '回目', NULL, 1, 18),
    (v_qs, '(1)', '差集め算', 'numeric', '10', '個', NULL, 1, 19),
    (v_qs, '(2)', '差集め算', 'numeric', '264', '個', NULL, 1, 20),
    (v_qs, '(3)', '差集め算', 'multi_part', NULL, NULL, '{"slots": [{"label": "ア", "unit": ""}, {"label": "イ", "unit": ""}], "correct_values": {"ア": "19", "イ": "149"}, "template": "ア{ア}，イ{イ}"}', 1, 21),
    (v_qs, '(4)', '差集め算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "個"}], "correct_values": {"①": "16", "②": "180"}, "template": "①{①}人，②{②}個"}', 1, 22),
    (v_qs, '(5)', '差集め算', 'numeric', '230', 'mL', NULL, 1, 23),
    (v_qs, '(6)', '差集め算', 'numeric', '62', '個', NULL, 1, 24),
    (v_qs, '(7)', '差集め算', 'numeric', '42', '人', NULL, 1, 25),
    (v_qs, '(8)', '差集め算', 'numeric', '17', '脚', NULL, 1, 26),
    (v_qs, '(9)', '差集め算', 'numeric', '1200', 'm', NULL, 1, 27),
    (v_qs, '(10)', '差集め算', 'numeric', '720', '円', NULL, 1, 28),
    (v_qs, '(11)', '差集め算', 'numeric', '600', '円', NULL, 1, 29),
    (v_qs, '(12)', '差集め算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "個"}, {"label": "②", "unit": "人"}], "correct_values": {"①": "4", "②": "12"}, "template": "①{①}個，②{②}人"}', 1, 30),
    (v_qs, '(1)', '年齢算', 'numeric', '3', '年後', NULL, 1, 31),
    (v_qs, '(2)', '年齢算', 'numeric', '15', '年後', NULL, 1, 32),
    (v_qs, '(3)', '年齢算', 'numeric', '5', '年後', NULL, 1, 33),
    (v_qs, '(4)', '年齢算', 'numeric', '13', '才', NULL, 1, 34),
    (v_qs, '(5)', '年齢算', 'multi_part', NULL, NULL, '{"slots": [{"label": "母", "unit": "才"}, {"label": "子", "unit": "才"}], "correct_values": {"母": "32", "子": "12"}, "template": "母{母}才，子{子}才"}', 1, 35),
    (v_qs, '(6)', '年齢算', 'multi_part', NULL, NULL, '{"slots": [{"label": "父", "unit": "才"}, {"label": "母", "unit": "才"}, {"label": "子", "unit": "才"}], "correct_values": {"父": "36", "母": "32", "子": "12"}, "template": "父{父}才，母{母}才，子{子}才"}', 1, 36),
    (v_qs, '(1)', '集合', 'numeric', '22', '人', NULL, 1, 37),
    (v_qs, '(2)', '集合', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "人"}, {"label": "③", "unit": "人"}], "correct_values": {"①": "5", "②": "5", "③": "2"}, "template": "①{①}人，②{②}人，③{③}人"}', 1, 38),
    (v_qs, '(3)', '集合', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "人"}, {"label": "③", "unit": "人"}, {"label": "④", "unit": "人"}, {"label": "⑤", "unit": "人"}, {"label": "⑥", "unit": "人"}], "correct_values": {"①": "10", "②": "12", "③": "5", "④": "12", "⑤": "3", "⑥": "4"}, "template": "①{①}人，②{②}人，③{③}人，④{④}人，⑤{⑤}人，⑥{⑥}人"}', 1, 39),
    (v_qs, '(4)', '集合', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "人"}, {"label": "②", "unit": "人"}, {"label": "③", "unit": "人"}, {"label": "④", "unit": "人"}, {"label": "⑤", "unit": "人"}, {"label": "⑥", "unit": "人"}, {"label": "⑦", "unit": "人"}], "correct_values": {"①": "27", "②": "23", "③": "17", "④": "5", "⑤": "16", "⑥": "12", "⑦": "4"}, "template": "①{①}人，②{②}人，③{③}人，④{④}人，⑤{⑤}人，⑥{⑥}人，⑦{⑦}人"}', 1, 40),
    (v_qs, '(5)', '集合', 'numeric', '3', 'こ', NULL, 1, 41);

    v_count := v_count + 41;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第2回① 規則性 (15問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 2;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第2回① 規則性（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第2回① 規則性', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第2回① 規則性';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第2回① 規則性', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '植木算', 'numeric', '32', 'm', NULL, 1, 1),
    (v_qs, '(2)', '植木算', 'numeric', '228', 'm', NULL, 1, 2),
    (v_qs, '(3)', '植木算', 'numeric', '12', '本', NULL, 1, 3),
    (v_qs, '(4)', '植木算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "37.5", "②": "20"}, "template": "①{①}㎝，②{②}㎝"}', 1, 4),
    (v_qs, '(5)', '植木算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "m"}, {"label": "②", "unit": "本"}], "correct_values": {"①": "252", "②": "70"}, "template": "①{①}m，②{②}本"}', 1, 5),
    (v_qs, '(1)', '周期算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}, {"label": "③", "unit": ""}], "correct_values": {"①": "7", "②": "1", "③": "193"}, "template": "①{①}，②{②}，③{③}"}', 1, 6),
    (v_qs, '(2)', '周期算', 'selection', NULL, NULL, '{"correct_values": ["金曜日"], "dummy_values": ["月曜日", "火曜日", "水曜日", "木曜日", "土曜日", "日曜日"]}', 1, 7),
    (v_qs, '(3)', '周期算', 'numeric', '49', '個', NULL, 1, 8),
    (v_qs, '(4)', '周期算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "個"}], "correct_values": {"①": "21", "②": "20"}, "template": "①{①}㎝，②{②}個"}', 1, 9),
    (v_qs, '(5)', '周期算', 'numeric', '9', NULL, NULL, 1, 10),
    (v_qs, '(1)', '等差数列', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": "個"}, {"label": "③", "unit": ""}], "correct_values": {"①": "77", "②": "21", "③": "861"}, "template": "①{①}，②{②}個，③{③}"}', 1, 11),
    (v_qs, '(2)', '等差数列', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": "個"}, {"label": "③", "unit": ""}], "correct_values": {"①": "176", "②": "34", "③": "3434"}, "template": "①{①}，②{②}個，③{③}"}', 1, 12),
    (v_qs, '(3)', '等差数列', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": "個"}, {"label": "③", "unit": ""}], "correct_values": {"①": "28", "②": "34", "③": "1717"}, "template": "①{①}，②{②}個，③{③}"}', 1, 13),
    (v_qs, '(1)', '長方形をならべて', 'numeric', '1100', '㎠', NULL, 1, 14),
    (v_qs, '(2)', '長方形をならべて', 'numeric', '720', '㎠', NULL, 1, 15);

    v_count := v_count + 15;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第2回② 規則性 (6問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 2;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第2回② 規則性（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第2回② 規則性', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第2回② 規則性';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第2回② 規則性', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '方陣算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "個"}, {"label": "②", "unit": "個"}], "correct_values": {"①": "225", "②": "56"}, "template": "①{①}個，②{②}個"}', 1, 1),
    (v_qs, '(2)', '方陣算', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "個"}, {"label": "②", "unit": "個"}], "correct_values": {"①": "78", "②": "33"}, "template": "①{①}個，②{②}個"}', 1, 2),
    (v_qs, '(3)', '方陣算', 'numeric', '235', '個', NULL, 1, 3),
    (v_qs, '(1)', '周期算②', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎠"}, {"label": "②", "unit": "枚"}, {"label": "③", "unit": "㎝"}, {"label": "④", "unit": "枚"}], "correct_values": {"①": "151", "②": "13", "③": "124", "④": "16"}, "template": "①{①}㎠，②{②}枚，③{③}㎝，④{④}枚"}', 1, 4),
    (v_qs, '(2)', '周期算②', 'numeric', '4', NULL, NULL, 1, 5),
    (v_qs, '(3)', '周期算②', 'numeric', '7', NULL, NULL, 1, 6);

    v_count := v_count + 6;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第3回① 平面図形(1) (32問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 3;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第3回① 平面図形(1)（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第3回① 平面図形(1)', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第3回① 平面図形(1)';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第3回① 平面図形(1)', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '角度', 'multi_part', NULL, NULL, '{"slots": [{"label": "ア", "unit": "°"}, {"label": "イ", "unit": "°"}], "correct_values": {"ア": "111", "イ": "94"}, "template": "ア{ア}°，イ{イ}°"}', 1, 1),
    (v_qs, '(2)', '角度', 'numeric', '76', '°', NULL, 1, 2),
    (v_qs, '(3)', '角度', 'numeric', '38', '°', NULL, 1, 3),
    (v_qs, '(4)', '角度', 'numeric', '46', '°', NULL, 1, 4),
    (v_qs, '(5)', '角度', 'multi_part', NULL, NULL, '{"slots": [{"label": "x", "unit": "°"}, {"label": "y", "unit": "°"}], "correct_values": {"x": "105", "y": "120"}, "template": "x{x}°，y{y}°"}', 1, 5),
    (v_qs, '(6)', '角度', 'numeric', '70', '°', NULL, 1, 6),
    (v_qs, '(7)', '角度', 'numeric', '75', '°', NULL, 1, 7),
    (v_qs, '(8)', '角度', 'numeric', '50', '°', NULL, 1, 8),
    (v_qs, '(9)', '角度', 'numeric', '105', '°', NULL, 1, 9),
    (v_qs, '(10)', '角度', 'numeric', '33', '°', NULL, 1, 10),
    (v_qs, '(11)', '角度', 'numeric', '74', '°', NULL, 1, 11),
    (v_qs, '(12)', '角度', 'numeric', '60', '°', NULL, 1, 12),
    (v_qs, '(13)', '角度', 'numeric', '105', '°', NULL, 1, 13),
    (v_qs, '(14)', '角度', 'numeric', '30', '°', NULL, 1, 14),
    (v_qs, '(15)', '角度', 'numeric', '15', '°', NULL, 1, 15),
    (v_qs, '(16)', '角度', 'multi_part', NULL, NULL, '{"slots": [{"label": "x", "unit": "°"}, {"label": "y", "unit": "°"}], "correct_values": {"x": "75", "y": "120"}, "template": "x{x}°，y{y}°"}', 1, 16),
    (v_qs, '(17)', '角度', 'numeric', '150', '°', NULL, 1, 17),
    (v_qs, '(18)', '角度', 'numeric', '75', '°', NULL, 1, 18),
    (v_qs, '(19)', '角度', 'numeric', '69', '°', NULL, 1, 19),
    (v_qs, '(20)', '角度', 'numeric', '14', '°', NULL, 1, 20),
    (v_qs, '(21)', '角度', 'numeric', '39', '°', NULL, 1, 21),
    (v_qs, '(1)', '面積', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎠"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "216", "②": "14.4"}, "template": "①{①}㎠，②{②}㎝"}', 1, 22),
    (v_qs, '(2)', '面積', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎠"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "144", "②": "9"}, "template": "①{①}㎠，②{②}㎝"}', 1, 23),
    (v_qs, '(3)', '面積', 'numeric', '4.5', '㎝', NULL, 1, 24),
    (v_qs, '(4)', '面積', 'numeric', '4', '㎝', NULL, 1, 25),
    (v_qs, '(5)', '面積', 'numeric', '32', '㎠', NULL, 1, 26),
    (v_qs, '(6)', '面積', 'numeric', '33', '㎠', NULL, 1, 27),
    (v_qs, '(7)', '面積', 'numeric', '49', '㎠', NULL, 1, 28),
    (v_qs, '(8)', '面積', 'numeric', '14', '㎠', NULL, 1, 29),
    (v_qs, '(9)', '面積', 'numeric', '18', '㎠', NULL, 1, 30),
    (v_qs, '(10)', '面積', 'numeric', '36', '㎠', NULL, 1, 31),
    (v_qs, '(11)', '面積', 'numeric', '9', '㎠', NULL, 1, 32);

    v_count := v_count + 32;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第3回② 平面図形(1) (21問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 3;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第3回② 平面図形(1)（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第3回② 平面図形(1)', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第3回② 平面図形(1)';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第3回② 平面図形(1)', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '多角形の性質', 'numeric', '27', '本', NULL, 1, 1),
    (v_qs, '(2)', '多角形の性質', 'numeric', '1800', '°', NULL, 1, 2),
    (v_qs, '(3)', '多角形の性質', 'numeric', '156', '°', NULL, 1, 3),
    (v_qs, '(4)', '多角形の性質', 'selection', NULL, NULL, '{"correct_values": ["十四角形"], "dummy_values": ["十角形", "十二角形", "十六角形", "十八角形"]}', 1, 4),
    (v_qs, '(1)', '面積の求め方の工夫', 'numeric', '70', '㎠', NULL, 1, 5),
    (v_qs, '(2)', '面積の求め方の工夫', 'numeric', '52', '㎠', NULL, 1, 6),
    (v_qs, '(3)', '面積の求め方の工夫', 'numeric', '81', '㎠', NULL, 1, 7),
    (v_qs, '(4)', '面積の求め方の工夫', 'numeric', '20', '㎠', NULL, 1, 8),
    (v_qs, '(5)', '面積の求め方の工夫', 'numeric', '25', '㎠', NULL, 1, 9),
    (v_qs, '(6)', '面積の求め方の工夫', 'numeric', '16', '㎠', NULL, 1, 10),
    (v_qs, '(1)', '円とおうぎ形', 'multi_part', NULL, NULL, '{"slots": [{"label": "円周", "unit": "㎝"}, {"label": "面積", "unit": "㎠"}], "correct_values": {"円周": "50.24", "面積": "200.96"}, "template": "円周{円周}㎝，面積{面積}㎠"}', 1, 11),
    (v_qs, '(2)', '円とおうぎ形', 'multi_part', NULL, NULL, '{"slots": [{"label": "弧", "unit": "㎝"}, {"label": "面積", "unit": "㎠"}], "correct_values": {"弧": "12.56", "面積": "62.8"}, "template": "弧{弧}㎝，面積{面積}㎠"}', 1, 12),
    (v_qs, '(3)', '円とおうぎ形', 'numeric', '36.48', '㎠', NULL, 1, 13),
    (v_qs, '(4)', '円とおうぎ形', 'numeric', '12.5', '㎠', NULL, 1, 14),
    (v_qs, '(5)', '円とおうぎ形', 'numeric', '50', '㎠', NULL, 1, 15),
    (v_qs, '(6)', '円とおうぎ形', 'numeric', '9', '㎠', NULL, 1, 16),
    (v_qs, '(7)', '円とおうぎ形', 'numeric', '16', '㎠', NULL, 1, 17),
    (v_qs, '(8)', '円とおうぎ形', 'numeric', '5.7', '㎝', NULL, 1, 18),
    (v_qs, '(9)', '円とおうぎ形', 'numeric', '0.86', '㎝', NULL, 1, 19),
    (v_qs, '(10)', '円とおうぎ形', 'numeric', '18.5', '㎠', NULL, 1, 20),
    (v_qs, '(11)', '円とおうぎ形', 'numeric', '69.08', '㎠', NULL, 1, 21);

    v_count := v_count + 21;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第4回① 容器と水量・変化とグラフ (9問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 4;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 1;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第4回① 容器と水量・変化とグラフ（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第4回① 容器と水量・変化とグラフ', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第4回① 容器と水量・変化とグラフ';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第4回① 容器と水量・変化とグラフ', 1, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '底面積と深さ', 'numeric', '7', '㎝', NULL, 1, 1),
    (v_qs, '(2)', '底面積と深さ', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "L"}, {"label": "②", "unit": "㎠"}], "correct_values": {"①": "2.88", "②": "144"}, "template": "①{①}L，②{②}㎠"}', 1, 2),
    (v_qs, '(1)', '水そうグラフ', 'numeric', '1.3', 'L', NULL, 1, 3),
    (v_qs, '(2)', '水そうグラフ', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "L"}, {"label": "②", "unit": "L"}], "correct_values": {"①": "2", "②": "4"}, "template": "①{①}L，②{②}L"}', 1, 4),
    (v_qs, '(3)', '水そうグラフ', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "分後"}, {"label": "②", "unit": "分後"}], "correct_values": {"①": "15", "②": "10"}, "template": "①{①}分後，②{②}分後"}', 1, 5),
    (v_qs, '(4)', '水そうグラフ', 'numeric', '20', '分後', NULL, 1, 6),
    (v_qs, '(1)', '容器の傾け', 'multi_part', NULL, NULL, '{"slots": [{"label": "a", "unit": "㎝"}, {"label": "b", "unit": "㎝"}], "correct_values": {"a": "14", "b": "16"}, "template": "a{a}㎝，b{b}㎝"}', 1, 7),
    (v_qs, '(2)', '容器の傾け', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎤"}], "correct_values": {"①": "9", "②": "810"}, "template": "①{①}㎝，②{②}㎤"}', 1, 8),
    (v_qs, '(3)', '容器の傾け', 'numeric', '12', '㎝', NULL, 1, 9);

    v_count := v_count + 9;
  END IF;  -- approved / ELSE

  -- ========================================
  -- 小6 第4回② 容器と水量・変化とグラフ (12問)
  -- ========================================
  SELECT id INTO STRICT v_sid
  FROM public.study_sessions WHERE grade = 6 AND session_number = 4;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.question_sets
  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = 2;

  IF v_existing_status = 'approved' THEN
    RAISE NOTICE 'スキップ: 小6 第4回② 容器と水量・変化とグラフ（approved済み）';
  ELSE
    -- 新規 or draft昇格
    IF v_existing_id IS NOT NULL THEN
      -- draft → approved に昇格、既存 questions を入れ替え
      DELETE FROM public.questions WHERE question_set_id = v_existing_id;
      UPDATE public.question_sets
      SET status = 'approved', title = '第4回② 容器と水量・変化とグラフ', updated_at = now()
      WHERE id = v_existing_id;
      v_qs := v_existing_id;
      RAISE NOTICE 'draft昇格: 小6 第4回② 容器と水量・変化とグラフ';
    ELSE
      -- 新規INSERT
      INSERT INTO public.question_sets
        (session_id, subject_id, grade, title, display_order, status)
      VALUES
        (v_sid, v_math_id, 6, '第4回② 容器と水量・変化とグラフ', 2, 'approved')
      RETURNING id INTO v_qs;
    END IF;

    INSERT INTO public.questions
      (question_set_id, question_number, section_name, answer_type,
       correct_answer, unit_label, answer_config, points, display_order)
    VALUES
    (v_qs, '(1)', '仕切りのある容器', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "42", "②": "40"}, "template": "①{①}㎝，②{②}㎝"}', 1, 1),
    (v_qs, '(2)', '仕切りのある容器', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "分"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "25", "②": "10"}, "template": "①{①}分，②{②}㎝"}', 1, 2),
    (v_qs, '(1)', '容器の傾け②', 'numeric', '3600', '㎤', NULL, 1, 3),
    (v_qs, '(2)', '容器の傾け②', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎤"}], "correct_values": {"①": "11", "②": "6200"}, "template": "①{①}㎝，②{②}㎤"}', 1, 4),
    (v_qs, '(1)', '階段グラフ', 'numeric', '1120', '円', NULL, 1, 5),
    (v_qs, '(2)', '階段グラフ', 'numeric', '1300', '円', NULL, 1, 6),
    (v_qs, '(3)', '階段グラフ', 'numeric', '800', '円', NULL, 1, 7),
    (v_qs, '(4)', '階段グラフ', 'numeric', '1100', '円', NULL, 1, 8),
    (v_qs, '(1)', '物体を沈める問題', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "24", "②": "29"}, "template": "①{①}㎝，②{②}㎝"}', 1, 9),
    (v_qs, '(2)', '物体を沈める問題', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "30", "②": "36"}, "template": "①{①}㎝，②{②}㎝"}', 1, 10),
    (v_qs, '(3)', '物体を沈める問題', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎤"}, {"label": "②", "unit": "㎤"}], "correct_values": {"①": "1600", "②": "6000"}, "template": "①{①}㎤，②{②}㎤"}', 1, 11),
    (v_qs, '(4)', '物体を沈める問題', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": "㎝"}, {"label": "②", "unit": "㎝"}], "correct_values": {"①": "17", "②": "16"}, "template": "①{①}㎝，②{②}㎝"}', 1, 12);

    v_count := v_count + 12;
  END IF;  -- approved / ELSE

  RAISE NOTICE '本番問題データ投入完了: %問', v_count;

END $$;

