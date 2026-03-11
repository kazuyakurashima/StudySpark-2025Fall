-- ============================================================================
-- 国語 総合回 問題数 40→80 + 小5 第2回組分けテスト日程修正
-- 作成日: 2026-03-11
--
-- 変更内容:
-- A. problem_counts: 国語・漢字の総合回(組分けテスト週)を 40→80 に更新
--    - 小5: session 5, 9, 14, 18 × コース A/B/C/S = 16行
--    - 小6: session 5, 9, 14, 18 × コース A/B/C/S = 16行
--    - 合計: 32行
--
-- B. test_schedules: 小5 第2回組分けテスト 5/15→5/10
--    - test_date, goal_setting_end_date, result_entry_start_date を修正
--    - 合計: 1行
--
-- 影響範囲:
-- - テーブル: problem_counts, test_schedules
-- - 既存データへの影響: 問題数と日付の更新のみ、FK制約に影響なし
-- - 既存 study_logs への影響: なし
--
-- ロールバック:
-- A. UPDATE problem_counts SET total_problems = 40 WHERE ... (同条件)
-- B. UPDATE test_schedules SET test_date='2026-05-15', goal_setting_end_date='2026-05-15',
--    result_entry_start_date='2026-05-15' WHERE ... (同条件)
-- ============================================================================

BEGIN;

-- ==========================================================================
-- A. 国語 総合回 問題数 40→80
-- ==========================================================================
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.problem_counts
  SET total_problems = 80
  WHERE study_content_type_id IN (
    SELECT sct.id
    FROM public.study_content_types sct
    JOIN public.subjects s ON s.id = sct.subject_id
    WHERE s.name = '国語' AND sct.content_name = '漢字'
  )
  AND session_id IN (
    SELECT ss.id
    FROM public.study_sessions ss
    WHERE (ss.grade = 5 AND ss.session_number IN (5, 9, 14, 18))
       OR (ss.grade = 6 AND ss.session_number IN (5, 9, 14, 18))
  );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 32 THEN
    RAISE EXCEPTION '[problem_counts] Expected 32 rows updated, but got %', v_updated_count;
  END IF;

  RAISE NOTICE '[problem_counts] Updated % rows (国語漢字 総合回 40→80)', v_updated_count;
END $$;

-- ==========================================================================
-- B. 小5 第2回組分けテスト 5/15→5/10
-- ==========================================================================
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.test_schedules
  SET
    test_date = '2026-05-10',
    goal_setting_end_date = '2026-05-10',
    result_entry_start_date = '2026-05-10'
  WHERE test_type_id = (
    SELECT id FROM public.test_types
    WHERE grade = 5 AND name = '組分けテスト'
  )
  AND test_number = 2;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION '[test_schedules] Expected 1 row updated, but got %', v_updated_count;
  END IF;

  RAISE NOTICE '[test_schedules] Updated % row (小5 第2回組分け 5/15→5/10)', v_updated_count;
END $$;

COMMIT;
