-- =========================================
-- 本番環境：テーブル存在確認SQL
-- =========================================

-- 1. 全スキーマのparent_student_relationshipsテーブルを検索
-- =========================================
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'parent_student_relationships';

-- 2. publicスキーマの全テーブル一覧
-- =========================================
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. 現在のsearch_pathを確認
-- =========================================
SHOW search_path;

-- 4. 現在のロール（ユーザー）を確認
-- =========================================
SELECT current_user, current_role;

-- 5. parent_student_relationshipsテーブルの権限を確認
-- =========================================
SELECT
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'parent_student_relationships'
  AND table_schema = 'public';

-- 6. テーブルが本当に存在するか直接確認
-- =========================================
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'parent_student_relationships'
) AS table_exists;

-- 7. もしテーブルが存在しない場合、作成する
-- =========================================
-- 以下は必要な場合のみ実行してください

/*
CREATE TABLE IF NOT EXISTS public.parent_student_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent', 'guardian')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- RLSを有効化
ALTER TABLE public.parent_student_relationships ENABLE ROW LEVEL SECURITY;

-- Service Roleは全アクセス可能
CREATE POLICY "Service role has full access" ON public.parent_student_relationships
  FOR ALL USING (true);

-- 保護者は自分の関係のみ閲覧可能
CREATE POLICY "Parents can view their relationships" ON public.parent_student_relationships
  FOR SELECT USING (
    auth.uid() = parent_id
  );

-- 管理者・指導者は全て閲覧可能
CREATE POLICY "Admins and coaches can view all" ON public.parent_student_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );
*/
