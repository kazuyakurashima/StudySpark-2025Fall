-- profilesテーブルのRLSポリシーを確認

-- 1. RLSが有効か
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. どのポリシーが設定されているか
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- 3. もしポリシーが厳しすぎる場合、一時的にRLSを無効化してテスト
-- （デバッグ後は必ず再有効化すること）
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
