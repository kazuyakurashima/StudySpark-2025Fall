-- 本番環境のテーブル一覧を確認

SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 特に重要なテーブルの存在確認
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_logs') THEN '✅ 存在' ELSE '❌ 未作成' END as study_logs,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'encouragement_messages') THEN '✅ 存在' ELSE '❌ 未作成' END as encouragement_messages,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_schedules') THEN '✅ 存在' ELSE '❌ 未作成' END as test_schedules,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN '✅ 存在' ELSE '❌ 未作成' END as profiles,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN '✅ 存在' ELSE '❌ 未作成' END as students,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN '✅ 存在' ELSE '❌ 未作成' END as parents;
