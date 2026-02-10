-- ============================================================================
-- 本番環境 確認用SQL（Supabase SQL Editor で実行）
-- 目的: study_sessions / study_content_types / study_logs の状態を診断し、
--        2026年度マイグレーション適用の前提条件を確認する
-- 実行タイミング: マイグレーション適用前（読み取りのみ、データ変更なし）
-- ============================================================================

-- 1. study_sessions の現在の日付を確認
--    → 2025年（9月始まり）のデータが返ればマイグレーション未適用
SELECT '=== 1. study_sessions 現在のデータ ===' AS section;
SELECT grade, session_number, start_date, end_date
FROM study_sessions
ORDER BY grade, session_number;

-- 2. study_sessions の件数サマリ
SELECT '=== 2. study_sessions 件数サマリ ===' AS section;
SELECT grade, COUNT(*) AS session_count,
       MIN(start_date) AS earliest_start,
       MAX(end_date) AS latest_end
FROM study_sessions
GROUP BY grade
ORDER BY grade;

-- 3. study_logs の件数（20260206000002 の安全チェックに影響）
--    → 1件でもあると study_content_types 入替マイグレーションが中断する
SELECT '=== 3. study_logs 件数 ===' AS section;
SELECT COUNT(*) AS total_study_logs FROM study_logs;

-- 4. study_content_types の状態
--    → 2025年版か2026年版か確認
SELECT '=== 4. study_content_types サンプル ===' AS section;
SELECT sct.id, sct.grade, s.name AS subject, sct.course, sct.content_name
FROM study_content_types sct
JOIN subjects s ON s.id = sct.subject_id
ORDER BY sct.grade, s.display_order, sct.course, sct.display_order
LIMIT 20;

-- 5. problem_counts の件数
SELECT '=== 5. problem_counts 件数 ===' AS section;
SELECT COUNT(*) AS total_problem_counts FROM problem_counts;

-- 6. assessment_masters の session_number 制約確認
--    → 2026年度の制約緩和（>= 1）が適用済みか
SELECT '=== 6. assessment_masters 制約確認 ===' AS section;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'assessment_masters'::regclass
  AND conname LIKE '%session_number%';

-- 7. assessment_masters の件数サマリ
SELECT '=== 7. assessment_masters 件数サマリ ===' AS section;
SELECT grade, assessment_type, COUNT(*) AS count, MAX(session_number) AS max_session
FROM assessment_masters
GROUP BY grade, assessment_type
ORDER BY grade, assessment_type;
