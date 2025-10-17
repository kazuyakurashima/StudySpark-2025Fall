-- デバッグのため、profilesのRLSを完全に無効化

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- 期待される結果: rowsecurity = false
