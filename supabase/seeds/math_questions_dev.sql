-- ============================================================================
-- 算数自動採点 — 開発用サンプルデータ
-- ============================================================================
-- 目的: 全4 answer_type をカバーするテストデータ（E2E動作確認用）
-- 実行: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seeds/math_questions_dev.sql
-- 注意: 本番データは別ファイルで管理（ユーザー提供の模範解答を元に作成）
--
-- 投入内容:
--   小5 第1回① (question_set 1): 10問 (numeric×5, fraction×1, multi_part×2, selection×2)
--   小5 第1回② (question_set 2): 6問  (numeric×4, multi_part×1, selection×1)
--   合計: 16問

DO $$
DECLARE
  v_math_id    BIGINT;
  v_session_id BIGINT;
  v_qs1_id     BIGINT;
  v_qs2_id     BIGINT;
BEGIN

  -- 算数の subject_id を取得
  SELECT id INTO STRICT v_math_id
  FROM public.subjects WHERE name = '算数';

  -- 小5 第1回の session_id を取得
  SELECT id INTO STRICT v_session_id
  FROM public.study_sessions WHERE grade = 5 AND session_number = 1;

  -- ============================================================
  -- question_sets: 小5 第1回 ①②
  -- ============================================================
  INSERT INTO public.question_sets
    (session_id, subject_id, grade, title, display_order, status)
  VALUES
    (v_session_id, v_math_id, 5, '第1回①', 1, 'approved')
  RETURNING id INTO v_qs1_id;

  INSERT INTO public.question_sets
    (session_id, subject_id, grade, title, display_order, status)
  VALUES
    (v_session_id, v_math_id, 5, '第1回②', 2, 'approved')
  RETURNING id INTO v_qs2_id;

  -- ============================================================
  -- questions: 第1回① (10問)
  -- ============================================================

  -- (1) numeric: 面積計算 42 cm²
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(1)', '類題1', 'numeric',
     '42', 'cm²', NULL, 1, 1);

  -- (2) numeric: 体積計算 150 cm³
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(2)', '類題1', 'numeric',
     '150', 'cm³', NULL, 1, 2);

  -- (3) fraction: 3/4
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(3)', '類題1', 'fraction',
     '3/4', NULL, NULL, 1, 3);

  -- (4) numeric: 小数 3.14
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(4)', '類題2', 'numeric',
     '3.14', NULL, NULL, 1, 4);

  -- (5) numeric: 負数 -7
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(5)', '類題2', 'numeric',
     '-7', NULL, NULL, 1, 5);

  -- (6) multi_part: Aは14個、Bは11個
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(6)', '計算練習', 'multi_part',
     NULL, NULL,
     '{"slots": [{"label": "A", "unit": "個"}, {"label": "B", "unit": "個"}], "correct_values": {"A": "14", "B": "11"}, "template": "Aは{A}個、Bは{B}個"}',
     1, 6);

  -- (7) multi_part: 50円切手5枚、80円切手8枚
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(7)', '計算練習', 'multi_part',
     NULL, NULL,
     '{"slots": [{"label": "50円切手", "unit": "枚"}, {"label": "80円切手", "unit": "枚"}], "correct_values": {"50円切手": "5", "80円切手": "8"}, "template": "50円切手{50円切手}枚、80円切手{80円切手}枚"}',
     1, 7);

  -- (8) numeric: 大きい数 12345
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(8)', '基本問題', 'numeric',
     '12345', NULL, NULL, 1, 8);

  -- (9) selection: 約数を選ぶ（12の約数: 1,2,3,4,6,12 から3つ）
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(9)', '基本問題', 'selection',
     NULL, NULL,
     '{"correct_values": ["3", "6", "12"], "dummy_values": ["5", "8", "10"]}',
     1, 9);

  -- (10) selection: 奇数を選ぶ
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs1_id, '(10)', '基本問題', 'selection',
     NULL, NULL,
     '{"correct_values": ["1", "3", "7"], "dummy_values": ["2", "4", "6", "8"]}',
     1, 10);

  -- ============================================================
  -- questions: 第1回② (6問)
  -- ============================================================

  -- (1) numeric: 72
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(1)', '類題1', 'numeric',
     '72', 'cm²', NULL, 1, 1);

  -- (2) numeric: 256
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(2)', '類題1', 'numeric',
     '256', NULL, NULL, 1, 2);

  -- (3) numeric: 0.75
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(3)', '類題2', 'numeric',
     '0.75', NULL, NULL, 1, 3);

  -- (4) numeric: 99
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(4)', '類題2', 'numeric',
     '99', '点', NULL, 1, 4);

  -- (5) multi_part: 赤3個、青5個
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(5)', '基本問題', 'multi_part',
     NULL, NULL,
     '{"slots": [{"label": "赤", "unit": "個"}, {"label": "青", "unit": "個"}], "correct_values": {"赤": "3", "青": "5"}, "template": "赤{赤}個、青{青}個"}',
     1, 5);

  -- (6) selection: テキスト選択（曜日）
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
    (v_qs2_id, '(6)', '基本問題', 'selection',
     NULL, NULL,
     '{"correct_values": ["金曜日"], "dummy_values": ["月曜日", "火曜日", "水曜日", "木曜日", "土曜日", "日曜日"]}',
     1, 6);

  RAISE NOTICE '開発用サンプルデータ投入完了: question_set_id=%, % (16問)',
    v_qs1_id, v_qs2_id;

END $$;
