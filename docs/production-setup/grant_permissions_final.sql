-- 権限を再付与（これが根本的な問題でした）

-- 1. profilesテーブルの権限を付与
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO service_role;

-- 2. 他の主要テーブルにも権限を付与
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_logs TO service_role;

GRANT SELECT ON public.test_schedules TO authenticated;
GRANT SELECT ON public.test_schedules TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encouragement_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encouragement_messages TO service_role;

-- 3. シーケンスの権限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 4. RLSを正しく戻す
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. 確認
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
