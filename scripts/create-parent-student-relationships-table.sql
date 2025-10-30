-- =========================================
-- 本番環境：parent_student_relationships テーブル作成
-- =========================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS public.parent_student_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent', 'guardian')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student_relationships(student_id);

-- RLSを有効化
ALTER TABLE public.parent_student_relationships ENABLE ROW LEVEL SECURITY;

-- ポリシー1: 保護者は自分の関係のみ閲覧可能
CREATE POLICY "Parents can view their relationships" ON public.parent_student_relationships
  FOR SELECT USING (
    auth.uid() = parent_id
  );

-- ポリシー2: 生徒は自分に関する関係を閲覧可能
CREATE POLICY "Students can view their relationships" ON public.parent_student_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = student_id
      AND user_id = auth.uid()
    )
  );

-- ポリシー3: 管理者・指導者は全て閲覧可能
CREATE POLICY "Admins and coaches can view all" ON public.parent_student_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- ポリシー4: Service Roleは全アクセス可能（APIからの操作用）
CREATE POLICY "Service role has full access" ON public.parent_student_relationships
  FOR ALL USING (true);

-- 確認：テーブルが作成されたか
SELECT
  'TABLE CREATED' as status,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'parent_student_relationships';

-- 確認：制約が正しく設定されたか
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.parent_student_relationships'::regclass
ORDER BY conname;
