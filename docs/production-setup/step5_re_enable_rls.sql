-- ============================================================================
-- STEP 5: RLSを再有効化
-- ============================================================================
-- 全てのユーザー作成が完了したら、セキュリティのためRLSを再有効化

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_relations ENABLE ROW LEVEL SECURITY;

-- 確認
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'students', 'parents', 'parent_child_relations')
ORDER BY tablename;

-- 期待される結果: 全てのテーブルで rls_enabled = true
