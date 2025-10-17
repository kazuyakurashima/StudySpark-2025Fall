-- デバッグのため、一時的にRLSを無効化してログインをテスト

-- profilesテーブルのRLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 期待される結果: rls_enabled = false

-- 注意: ログインテストが成功したら、必ず再有効化してください！
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
