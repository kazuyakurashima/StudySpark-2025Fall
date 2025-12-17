-- ============================================================================
-- 本番DB実行用SQL【ステップ2: トランザクション一括実行】
-- ============================================================================
-- 実行環境: Supabase Dashboard SQL Editor (本番環境)
-- 実行タイミング: ステップ1完了後、rollback_sqlを保存してから
--
-- ⚠️ 重要な注意事項:
--   - このスクリプトはCOMMIT;を含むため、実行＝確定です
--   - 実行前に必ず以下を確認してください:
--     ✅ UPDATE対象の日付が正しいか（15件すべて）
--     ✅ WHERE句が「grade = 6 AND session_number = N」で限定されているか
--     ✅ 15本のUPDATE文がすべて含まれているか
--     ✅ docs/migration-log.mdにrollback_sqlを保存済みか
-- ============================================================================

BEGIN;

-- 暴走防止（10秒でタイムアウト）
SET LOCAL statement_timeout = '10s';

-- 事前確認：対象件数が15件であることを確認
SELECT count(*) AS "対象件数（修正前）"
FROM public.study_sessions
WHERE grade = 6;

-- ============================================================================
-- 15件のUPDATE（小学6年生の学習回期間修正）
-- ============================================================================

UPDATE public.study_sessions SET start_date = '2025-08-25', end_date = '2025-09-07' WHERE grade = 6 AND session_number = 1;
UPDATE public.study_sessions SET start_date = '2025-09-08', end_date = '2025-09-14' WHERE grade = 6 AND session_number = 2;
UPDATE public.study_sessions SET start_date = '2025-09-15', end_date = '2025-09-21' WHERE grade = 6 AND session_number = 3;
UPDATE public.study_sessions SET start_date = '2025-09-22', end_date = '2025-10-05' WHERE grade = 6 AND session_number = 4;
UPDATE public.study_sessions SET start_date = '2025-10-06', end_date = '2025-10-12' WHERE grade = 6 AND session_number = 5;
UPDATE public.study_sessions SET start_date = '2025-10-13', end_date = '2025-10-19' WHERE grade = 6 AND session_number = 6;
UPDATE public.study_sessions SET start_date = '2025-10-20', end_date = '2025-10-26' WHERE grade = 6 AND session_number = 7;
UPDATE public.study_sessions SET start_date = '2025-10-27', end_date = '2025-11-02' WHERE grade = 6 AND session_number = 8;
UPDATE public.study_sessions SET start_date = '2025-11-03', end_date = '2025-11-16' WHERE grade = 6 AND session_number = 9;
UPDATE public.study_sessions SET start_date = '2025-11-17', end_date = '2025-11-23' WHERE grade = 6 AND session_number = 10;
UPDATE public.study_sessions SET start_date = '2025-11-24', end_date = '2025-11-30' WHERE grade = 6 AND session_number = 11;
UPDATE public.study_sessions SET start_date = '2025-12-01', end_date = '2025-12-14' WHERE grade = 6 AND session_number = 12;
UPDATE public.study_sessions SET start_date = '2025-12-15', end_date = '2025-12-21' WHERE grade = 6 AND session_number = 13;
UPDATE public.study_sessions SET start_date = '2025-12-22', end_date = '2026-01-11' WHERE grade = 6 AND session_number = 14;
UPDATE public.study_sessions SET start_date = '2026-01-12', end_date = '2026-01-18' WHERE grade = 6 AND session_number = 15;

-- ============================================================================
-- 事後確認
-- ============================================================================

-- 対象件数が変わっていないことを確認
SELECT count(*) AS "対象件数（修正後）"
FROM public.study_sessions
WHERE grade = 6;

-- 結果確認（修正後の期間）
SELECT
  session_number AS "回",
  start_date AS "開始日",
  end_date AS "終了日",
  CONCAT(TO_CHAR(start_date, 'MM/DD'), '〜', TO_CHAR(end_date, 'MM/DD')) AS "表示"
FROM public.study_sessions
WHERE grade = 6
ORDER BY session_number;

-- ============================================================================
-- ✅ このCOMMITで変更が確定されます
-- ============================================================================
COMMIT;

-- ============================================================================
-- 実行結果の確認ポイント:
--   1. 対象件数（修正前）: 15
--   2. 15行の「UPDATE 1」が表示される
--   3. 対象件数（修正後）: 15（変わらないこと）
--   4. SELECT結果が期待する15件の期間になっている
--
-- 期待される結果:
--   第1回: 08/25〜09/07
--   第2回: 09/08〜09/14
--   第3回: 09/15〜09/21
--   第4回: 09/22〜10/05
--   第5回: 10/06〜10/12
--   第6回: 10/13〜10/19
--   第7回: 10/20〜10/26
--   第8回: 10/27〜11/02
--   第9回: 11/03〜11/16
--   第10回: 11/17〜11/23
--   第11回: 11/24〜11/30
--   第12回: 12/01〜12/14
--   第13回: 12/15〜12/21
--   第14回: 12/22〜01/11
--   第15回: 01/12〜01/18
--
-- 📝 次のステップ:
--   1. 実行結果をdocs/migration-log.mdに記録
--   2. 本番サイトで動作確認
--   3. （任意）supabase migration repairで履歴同期
-- ============================================================================
