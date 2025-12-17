-- ============================================================================
-- マスターデータ投入（seed.sql）
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 学習回、科目、学習内容、問題数などのマスターデータを投入

-- ----------------------------------------------------------------------------
-- 1. 科目マスタ
-- ----------------------------------------------------------------------------
INSERT INTO public.subjects (name, display_order, color_code) VALUES
('算数', 1, '#3B82F6'),  -- 青
('国語', 2, '#EF4444'),  -- 赤
('理科', 3, '#F97316'),  -- オレンジ
('社会', 4, '#10B981')   -- 緑
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. 学習回マスタ
-- ----------------------------------------------------------------------------

-- 小学5年生: 19回（9/1 - 1/25）
INSERT INTO public.study_sessions (grade, session_number, start_date, end_date) VALUES
(5, 1,  '2025-09-01', '2025-09-07'),
(5, 2,  '2025-09-08', '2025-09-14'),
(5, 3,  '2025-09-15', '2025-09-21'),
(5, 4,  '2025-09-22', '2025-09-28'),
(5, 5,  '2025-09-29', '2025-10-05'),
(5, 6,  '2025-10-06', '2025-10-12'),
(5, 7,  '2025-10-13', '2025-10-19'),
(5, 8,  '2025-10-20', '2025-10-26'),
(5, 9,  '2025-10-27', '2025-11-02'),
(5, 10, '2025-11-03', '2025-11-09'),
(5, 11, '2025-11-10', '2025-11-16'),
(5, 12, '2025-11-17', '2025-11-23'),
(5, 13, '2025-11-24', '2025-11-30'),
(5, 14, '2025-12-01', '2025-12-07'),
(5, 15, '2025-12-08', '2025-12-14'),
(5, 16, '2025-12-15', '2025-12-21'),
(5, 17, '2025-12-22', '2025-12-28'),
(5, 18, '2026-01-05', '2026-01-11'),
(5, 19, '2026-01-12', '2026-01-18')
ON CONFLICT (grade, session_number) DO NOTHING;

-- 小学6年生: 15回（8/25 - 1/18）
-- ※ 期間は docs/03-Requirements-Student.md の表示期間に準拠
INSERT INTO public.study_sessions (grade, session_number, start_date, end_date) VALUES
(6, 1,  '2025-08-25', '2025-09-07'),  -- 第1回: 8/25〜9/7
(6, 2,  '2025-09-08', '2025-09-14'),  -- 第2回: 9/8〜9/14
(6, 3,  '2025-09-15', '2025-09-21'),  -- 第3回: 9/15〜9/21
(6, 4,  '2025-09-22', '2025-10-05'),  -- 第4回: 9/22〜10/5
(6, 5,  '2025-10-06', '2025-10-12'),  -- 第5回: 10/6〜10/12
(6, 6,  '2025-10-13', '2025-10-19'),  -- 第6回: 10/13〜10/19
(6, 7,  '2025-10-20', '2025-10-26'),  -- 第7回: 10/20〜10/26
(6, 8,  '2025-10-27', '2025-11-02'),  -- 第8回: 10/27〜11/2
(6, 9,  '2025-11-03', '2025-11-16'),  -- 第9回: 11/3〜11/16
(6, 10, '2025-11-17', '2025-11-23'),  -- 第10回: 11/17〜11/23
(6, 11, '2025-11-24', '2025-11-30'),  -- 第11回: 11/24〜11/30
(6, 12, '2025-12-01', '2025-12-14'),  -- 第12回: 12/1〜12/14
(6, 13, '2025-12-15', '2025-12-21'),  -- 第13回: 12/15〜12/21
(6, 14, '2025-12-22', '2026-01-11'),  -- 第14回: 12/22〜1/11
(6, 15, '2026-01-12', '2026-01-18')   -- 第15回: 1/12〜1/18
ON CONFLICT (grade, session_number) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. 学習内容タイプマスタ
-- ----------------------------------------------------------------------------

-- 算数IDを取得
DO $$
DECLARE
  v_math_id BIGINT;
  v_japanese_id BIGINT;
  v_science_id BIGINT;
  v_social_id BIGINT;
BEGIN
  SELECT id INTO v_math_id FROM public.subjects WHERE name = '算数';
  SELECT id INTO v_japanese_id FROM public.subjects WHERE name = '国語';
  SELECT id INTO v_science_id FROM public.subjects WHERE name = '理科';
  SELECT id INTO v_social_id FROM public.subjects WHERE name = '社会';

  -- 小学5年生 - 算数
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (5, v_math_id, 'A', '類題', 1),
  (5, v_math_id, 'A', '基本問題', 2),
  (5, v_math_id, 'B', '類題', 1),
  (5, v_math_id, 'B', '基本問題', 2),
  (5, v_math_id, 'B', '練習問題', 3),
  (5, v_math_id, 'C', '類題', 1),
  (5, v_math_id, 'C', '基本問題', 2),
  (5, v_math_id, 'C', '練習問題', 3),
  (5, v_math_id, 'C', '演習問題集（実戦演習）', 4),
  (5, v_math_id, 'S', '類題', 1),
  (5, v_math_id, 'S', '基本問題', 2),
  (5, v_math_id, 'S', '練習問題', 3),
  (5, v_math_id, 'S', '演習問題集（実戦演習）', 4)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学5年生 - 国語
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (5, v_japanese_id, 'A', '確認問題', 1),
  (5, v_japanese_id, 'B', '確認問題', 1),
  (5, v_japanese_id, 'C', '確認問題', 1),
  (5, v_japanese_id, 'S', '確認問題', 1)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学5年生 - 理科
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (5, v_science_id, 'A', '演習問題集（基本問題）', 1),
  (5, v_science_id, 'B', '演習問題集（基本問題）', 1),
  (5, v_science_id, 'B', '演習問題集（練習問題）', 2),
  (5, v_science_id, 'C', '演習問題集（基本問題）', 1),
  (5, v_science_id, 'C', '演習問題集（練習問題）', 2),
  (5, v_science_id, 'C', '演習問題集（発展問題）', 3),
  (5, v_science_id, 'S', '演習問題集（基本問題）', 1),
  (5, v_science_id, 'S', '演習問題集（練習問題）', 2),
  (5, v_science_id, 'S', '演習問題集（発展問題）', 3)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学5年生 - 社会
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (5, v_social_id, 'A', '演習問題集（練習問題）', 1),
  (5, v_social_id, 'B', '演習問題集（練習問題）', 1),
  (5, v_social_id, 'B', '演習問題集（発展問題・記述問題）', 2),
  (5, v_social_id, 'C', '演習問題集（練習問題）', 1),
  (5, v_social_id, 'C', '演習問題集（発展問題・記述問題）', 2),
  (5, v_social_id, 'S', '演習問題集（練習問題）', 1),
  (5, v_social_id, 'S', '演習問題集（発展問題・記述問題）', 2)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学6年生 - 算数
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (6, v_math_id, 'A', '１行問題', 1),
  (6, v_math_id, 'A', '基本演習', 2),
  (6, v_math_id, 'A', '実戦演習', 3),
  (6, v_math_id, 'B', '１行問題', 1),
  (6, v_math_id, 'B', '基本演習', 2),
  (6, v_math_id, 'B', '実戦演習', 3),
  (6, v_math_id, 'C', '１行問題', 1),
  (6, v_math_id, 'C', '基本演習', 2),
  (6, v_math_id, 'C', '実戦演習', 3),
  (6, v_math_id, 'S', '１行問題', 1),
  (6, v_math_id, 'S', '基本演習', 2),
  (6, v_math_id, 'S', '実戦演習', 3)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学6年生 - 国語
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (6, v_japanese_id, 'A', '中学入試頻出漢字', 1),
  (6, v_japanese_id, 'B', '中学入試頻出漢字', 1),
  (6, v_japanese_id, 'C', '中学入試頻出漢字', 1),
  (6, v_japanese_id, 'S', '中学入試頻出漢字', 1)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学6年生 - 理科
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (6, v_science_id, 'A', '演習問題集（基本問題）', 1),
  (6, v_science_id, 'B', '演習問題集（基本問題）', 1),
  (6, v_science_id, 'C', '演習問題集（基本問題）', 1),
  (6, v_science_id, 'C', '演習問題集（練習問題）', 2),
  (6, v_science_id, 'S', '演習問題集（基本問題）', 1),
  (6, v_science_id, 'S', '演習問題集（練習問題）', 2)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

  -- 小学6年生 - 社会
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (6, v_social_id, 'A', '演習問題集（基本問題）', 1),
  (6, v_social_id, 'B', '演習問題集（基本問題）', 1),
  (6, v_social_id, 'B', '演習問題集（練習問題）', 2),
  (6, v_social_id, 'C', '演習問題集（基本問題）', 1),
  (6, v_social_id, 'C', '演習問題集（練習問題）', 2),
  (6, v_social_id, 'C', '演習問題集（応用問題）', 3),
  (6, v_social_id, 'S', '演習問題集（基本問題）', 1),
  (6, v_social_id, 'S', '演習問題集（練習問題）', 2),
  (6, v_social_id, 'S', '演習問題集（応用問題）', 3)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;

END $$;

-- ----------------------------------------------------------------------------
-- 4. テストタイプマスタ
-- ----------------------------------------------------------------------------
INSERT INTO public.test_types (grade, name, type_category, display_order) VALUES
(5, '組分けテスト', 'kumibun', 1),
(6, '合不合判定テスト', 'goufugou', 1)
ON CONFLICT (grade, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. テスト日程マスタ（サンプル）
-- ----------------------------------------------------------------------------

-- 小学5年生 - 組分けテスト（第5回〜第8回 + 新6年）
-- 要件定義: docs/03-Requirements-Student.md に基づく
DO $$
DECLARE
  v_test_type_id BIGINT;
BEGIN
  SELECT id INTO v_test_type_id FROM public.test_types WHERE grade = 5 AND name = '組分けテスト';

  INSERT INTO public.test_schedules (
    test_type_id,
    test_number,
    test_date,
    goal_setting_start_date,
    goal_setting_end_date,
    result_entry_start_date,
    result_entry_end_date
  ) VALUES
  -- 第5回: 実施日 8/31, 目標設定 7/1〜8/31, 結果入力 8/31〜10/31
  (v_test_type_id, 5, '2025-08-31', '2025-07-01', '2025-08-31', '2025-08-31', '2025-10-31'),
  -- 第6回: 実施日 10/5, 目標設定 9/1〜10/5, 結果入力 10/5〜11/30
	  (v_test_type_id, 6, '2025-10-05', '2025-09-01', '2025-10-05', '2025-10-05', '2025-11-30'),
	  -- 第7回: 実施日 11/9, 目標設定 10/1〜11/9, 結果入力 11/9〜12/31
	  (v_test_type_id, 7, '2025-11-09', '2025-10-01', '2025-11-09', '2025-11-09', '2025-12-31'),
	  -- 第8回: 実施日 12/14, 目標設定 11/1〜12/14, 結果入力 12/14〜1/31
	  (v_test_type_id, 8, '2025-12-14', '2025-11-01', '2025-12-14', '2025-12-14', '2026-01-31'),
	  -- 新6年: 実施日 1/25, 目標設定 12/1〜1/25, 結果入力 1/25〜2/28
	  (v_test_type_id, 9, '2026-01-25', '2025-12-01', '2026-01-25', '2026-01-25', '2026-02-28')
	  ON CONFLICT (test_type_id, test_number) DO NOTHING;

END $$;

-- 小学6年生 - 合不合判定テスト（第3回〜第6回）
-- 要件定義: docs/03-Requirements-Student.md に基づく
DO $$
DECLARE
  v_test_type_id BIGINT;
BEGIN
  SELECT id INTO v_test_type_id FROM public.test_types WHERE grade = 6 AND name = '合不合判定テスト';

  INSERT INTO public.test_schedules (
    test_type_id,
    test_number,
    test_date,
    goal_setting_start_date,
    goal_setting_end_date,
    result_entry_start_date,
    result_entry_end_date
  ) VALUES
  -- 第3回: 実施日 9/7, 目標設定 8/1〜9/7, 結果入力 9/7〜10/31
  (v_test_type_id, 3, '2025-09-07', '2025-08-01', '2025-09-07', '2025-09-07', '2025-10-31'),
  -- 第4回: 実施日 10/5, 目標設定 9/1〜10/5, 結果入力 10/5〜11/30
  (v_test_type_id, 4, '2025-10-05', '2025-09-01', '2025-10-05', '2025-10-05', '2025-11-30'),
  -- 第5回: 実施日 11/16, 目標設定 10/1〜11/16, 結果入力 11/16〜12/31
  (v_test_type_id, 5, '2025-11-16', '2025-10-01', '2025-11-16', '2025-11-16', '2025-12-31'),
  -- 第6回: 実施日 12/7, 目標設定 11/1〜12/7, 結果入力 12/7〜2/28
  (v_test_type_id, 6, '2025-12-07', '2025-11-01', '2025-12-07', '2025-12-07', '2026-02-28')
  ON CONFLICT (test_type_id, test_number) DO NOTHING;

END $$;

-- ----------------------------------------------------------------------------
-- 完了メッセージ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'マスターデータ投入完了';
  RAISE NOTICE '- 科目: 4件 (算数, 国語, 理科, 社会)';
  RAISE NOTICE '- 学習回: 小5=19回, 小6=15回';
  RAISE NOTICE '- 学習内容タイプ: 約80件';
  RAISE NOTICE '- テストタイプ: 2件';
  RAISE NOTICE '- テスト日程: 小5=5回, 小6=4回';
END $$;
