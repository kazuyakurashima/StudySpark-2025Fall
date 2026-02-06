-- =============================================================================
-- 2026年度: study_content_types 全面置換
-- 作成日: 2026-02-06
-- 生成元: scripts/generate-problem-counts-sql.py
-- ソース: 2026年四谷大塚DB.xlsx
--
-- study_content_types: 109 件
--
-- 用途:
-- - 既存DBの2025→2026アップグレード用（study_content_types を DELETE → INSERT で全面置換）
-- - 新規DB構築時は seed.sql が同一データを投入済みのため、本マイグレーションは冪等（DO NOTHING）
--
-- 注記:
-- - DELETE は CASCADE で problem_counts も自動削除される
-- - ⚠️ study_logs が存在する場合も CASCADE で削除されるため、事前チェックで中断する
-- - problem_counts は別ファイルで投入: supabase/seeds/problem_counts_2026.sql
-- - ※ seed.sql にも同一データあり。変更時は両方を更新すること
-- =============================================================================

DO $$
DECLARE
  v_math_id BIGINT;
  v_japanese_id BIGINT;
  v_science_id BIGINT;
  v_social_id BIGINT;
  v_log_count BIGINT;
BEGIN
  -- 科目ID取得
  SELECT id INTO v_math_id FROM public.subjects WHERE name = '算数';
  SELECT id INTO v_japanese_id FROM public.subjects WHERE name = '国語';
  SELECT id INTO v_science_id FROM public.subjects WHERE name = '理科';
  SELECT id INTO v_social_id FROM public.subjects WHERE name = '社会';

  -- 前提チェック: subjects が存在しない場合は中断
  IF v_math_id IS NULL OR v_japanese_id IS NULL OR v_science_id IS NULL OR v_social_id IS NULL THEN
    RAISE EXCEPTION 'subjects テーブルに必要な科目が不足しています (算数=%, 国語=%, 理科=%, 社会=%)。seed.sql を先に実行してください。',
      v_math_id, v_japanese_id, v_science_id, v_social_id;
  END IF;

  -- =========================================================================
  -- 1. 安全チェック: study_logs が存在する場合は中断
  --    study_content_types の DELETE は ON DELETE CASCADE で study_logs も
  --    削除するため、学習ログが存在する状態での実行は許可しない
  -- =========================================================================
  SELECT count(*) INTO v_log_count FROM public.study_logs;
  IF v_log_count > 0 THEN
    RAISE EXCEPTION 'study_logs に % 件のデータが存在します。学習ログを削除する危険があるため中断します。手動で確認してください。', v_log_count;
  END IF;

  -- =========================================================================
  -- 2. 既存 study_content_types を削除（CASCADE で problem_counts も削除）
  -- =========================================================================
  DELETE FROM public.study_content_types;
  RAISE NOTICE 'study_content_types 削除完了';

  -- =========================================================================
  -- 2. 2026年度 study_content_types を投入
  -- =========================================================================
  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES
  (5, v_math_id, 'A', '類題', 1),
  (5, v_math_id, 'B', '類題', 1),
  (5, v_math_id, 'C', '類題', 1),
  (5, v_math_id, 'S', '類題', 1),
  (5, v_math_id, 'A', '基本問題', 2),
  (5, v_math_id, 'B', '基本問題', 2),
  (5, v_math_id, 'C', '基本問題', 2),
  (5, v_math_id, 'S', '基本問題', 2),
  (5, v_math_id, 'B', '練習問題', 3),
  (5, v_math_id, 'C', '練習問題', 3),
  (5, v_math_id, 'S', '練習問題', 3),
  (5, v_math_id, 'C', '実戦演習', 4),
  (5, v_math_id, 'S', '実戦演習', 4),
  (6, v_math_id, 'A', '重要問題', 1),
  (6, v_math_id, 'B', '重要問題', 1),
  (6, v_math_id, 'C', '重要問題', 1),
  (6, v_math_id, 'S', '重要問題', 1),
  (6, v_math_id, 'B', '類題', 2),
  (6, v_math_id, 'C', '類題', 2),
  (6, v_math_id, 'S', '類題', 2),
  (6, v_math_id, 'C', 'ステップアップ演習', 3),
  (6, v_math_id, 'S', 'ステップアップ演習', 3),
  (6, v_math_id, 'A', '基本問題', 4),
  (6, v_math_id, 'B', '基本問題', 4),
  (6, v_math_id, 'C', '基本問題', 4),
  (6, v_math_id, 'S', '基本問題', 4),
  (6, v_math_id, 'C', '練習問題', 5),
  (6, v_math_id, 'S', '練習問題', 5),
  (6, v_math_id, 'S', 'ステップ③（難関校対策）', 6),
  (5, v_japanese_id, 'A', '漢字', 1),
  (5, v_japanese_id, 'B', '漢字', 1),
  (5, v_japanese_id, 'C', '漢字', 1),
  (5, v_japanese_id, 'S', '漢字', 1),
  (6, v_japanese_id, 'A', '漢字', 1),
  (6, v_japanese_id, 'B', '漢字', 1),
  (6, v_japanese_id, 'C', '漢字', 1),
  (6, v_japanese_id, 'S', '漢字', 1),
  (5, v_science_id, 'A', '予習：要点チェック', 1),
  (5, v_science_id, 'B', '予習：要点チェック', 1),
  (5, v_science_id, 'C', '予習：要点チェック', 1),
  (5, v_science_id, 'S', '予習：要点チェック', 1),
  (5, v_science_id, 'A', '予習：練習問題', 2),
  (5, v_science_id, 'B', '予習：練習問題', 2),
  (5, v_science_id, 'C', '予習：練習問題', 2),
  (5, v_science_id, 'S', '予習：練習問題', 2),
  (5, v_science_id, 'A', '演習：基本問題', 3),
  (5, v_science_id, 'B', '演習：基本問題', 3),
  (5, v_science_id, 'C', '演習：基本問題', 3),
  (5, v_science_id, 'S', '演習：基本問題', 3),
  (5, v_science_id, 'B', '演習：練習問題', 4),
  (5, v_science_id, 'C', '演習：練習問題', 4),
  (5, v_science_id, 'S', '演習：練習問題', 4),
  (5, v_science_id, 'C', '演習：発展問題', 5),
  (5, v_science_id, 'S', '演習：発展問題', 5),
  (5, v_science_id, 'S', '演習：応用問題', 6),
  (5, v_science_id, 'S', '演習：チャレンジ問題', 7),
  (6, v_science_id, 'A', '予習：練習問題', 1),
  (6, v_science_id, 'B', '予習：練習問題', 1),
  (6, v_science_id, 'C', '予習：練習問題', 1),
  (6, v_science_id, 'S', '予習：練習問題', 1),
  (6, v_science_id, 'C', '予習：応用問題', 2),
  (6, v_science_id, 'S', '予習：応用問題', 2),
  (6, v_science_id, 'A', '演習：基本問題', 3),
  (6, v_science_id, 'B', '演習：基本問題', 3),
  (6, v_science_id, 'C', '演習：基本問題', 3),
  (6, v_science_id, 'S', '演習：基本問題', 3),
  (6, v_science_id, 'B', '演習：練習問題', 4),
  (6, v_science_id, 'C', '演習：練習問題', 4),
  (6, v_science_id, 'S', '演習：練習問題', 4),
  (6, v_science_id, 'C', '演習：発展問題', 5),
  (6, v_science_id, 'S', '演習：発展問題', 5),
  (6, v_science_id, 'S', '演習：応用問題', 6),
  (6, v_science_id, 'S', '演習：チャレンジ問題', 7),
  (5, v_social_id, 'A', '要点チェック', 1),
  (5, v_social_id, 'B', '要点チェック', 1),
  (5, v_social_id, 'C', '要点チェック', 1),
  (5, v_social_id, 'S', '要点チェック', 1),
  (5, v_social_id, 'A', '練習', 2),
  (5, v_social_id, 'B', '練習', 2),
  (5, v_social_id, 'C', '練習', 2),
  (5, v_social_id, 'S', '練習', 2),
  (5, v_social_id, 'A', '練習問題', 3),
  (5, v_social_id, 'B', '練習問題', 3),
  (5, v_social_id, 'C', '練習問題', 3),
  (5, v_social_id, 'S', '練習問題', 3),
  (5, v_social_id, 'B', '発展問題', 4),
  (5, v_social_id, 'C', '発展問題', 4),
  (5, v_social_id, 'S', '発展問題', 4),
  (5, v_social_id, 'C', '応用', 5),
  (5, v_social_id, 'S', '応用', 5),
  (5, v_social_id, 'S', 'チャレンジ', 6),
  (6, v_social_id, 'A', '予習：要点チェック', 1),
  (6, v_social_id, 'B', '予習：要点チェック', 1),
  (6, v_social_id, 'C', '予習：要点チェック', 1),
  (6, v_social_id, 'S', '予習：要点チェック', 1),
  (6, v_social_id, 'A', '予習：練習問題', 2),
  (6, v_social_id, 'B', '予習：練習問題', 2),
  (6, v_social_id, 'C', '予習：練習問題', 2),
  (6, v_social_id, 'S', '予習：練習問題', 2),
  (6, v_social_id, 'A', '演習：練習問題', 3),
  (6, v_social_id, 'B', '演習：練習問題', 3),
  (6, v_social_id, 'C', '演習：練習問題', 3),
  (6, v_social_id, 'S', '演習：練習問題', 3),
  (6, v_social_id, 'B', '演習：応用', 4),
  (6, v_social_id, 'C', '演習：応用', 4),
  (6, v_social_id, 'S', '演習：応用', 4),
  (6, v_social_id, 'C', '演習：チャレンジ', 5),
  (6, v_social_id, 'S', '演習：チャレンジ', 5),
  (6, v_social_id, 'S', '演習：発展', 6)
  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;
  RAISE NOTICE 'study_content_types 投入完了: 109 件';

END $$;
