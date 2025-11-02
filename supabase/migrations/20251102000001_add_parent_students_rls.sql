-- ============================================================================
-- 20251102000001_add_parent_students_rls.sql
-- 説明: Phase 2 - 保護者ダッシュボード用RLSポリシー追加
-- 目的: Service Role依存を排除し、通常のクライアント（createClient）でデータアクセス可能に
-- ============================================================================

-- ================================
-- students テーブル
-- ================================
-- RLS有効化
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除（もしあれば）
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can view and update own profile" ON public.students;
  DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
  DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;
  DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- 生徒: 自分のプロフィールを閲覧・更新
CREATE POLICY "Students can view and update own profile"
  ON public.students
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 保護者: 自分の子供のプロフィールを閲覧
CREATE POLICY "Parents can view children profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 指導者: 担当生徒のプロフィールを閲覧
CREATE POLICY "Coaches can view assigned students profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- 管理者: すべての生徒を管理
CREATE POLICY "Admins can manage all students"
  ON public.students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- マスタデータテーブル（全員閲覧可能）
-- ================================

-- study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone authenticated can view study sessions" ON public.study_sessions;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Anyone authenticated can view study sessions"
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON public.subjects;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Anyone authenticated can view subjects"
  ON public.subjects
  FOR SELECT
  TO authenticated
  USING (true);

-- study_content_types
ALTER TABLE public.study_content_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone authenticated can view study content types" ON public.study_content_types;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Anyone authenticated can view study content types"
  ON public.study_content_types
  FOR SELECT
  TO authenticated
  USING (true);

-- problem_counts
ALTER TABLE public.problem_counts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone authenticated can view problem counts" ON public.problem_counts;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Anyone authenticated can view problem counts"
  ON public.problem_counts
  FOR SELECT
  TO authenticated
  USING (true);

-- ================================
-- インデックス追加（パフォーマンス向上）
-- ================================

-- parent_child_relationsのJOIN用インデックス（既存かもしれないが念のため）
CREATE INDEX IF NOT EXISTS idx_parent_child_relations_parent_id
  ON public.parent_child_relations(parent_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_relations_student_id
  ON public.parent_child_relations(student_id);

-- parentsテーブルのuser_id検索用インデックス
CREATE INDEX IF NOT EXISTS idx_parents_user_id
  ON public.parents(user_id);

-- studentsテーブルのuser_id検索用インデックス
CREATE INDEX IF NOT EXISTS idx_students_user_id
  ON public.students(user_id);

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
--
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- -- students
-- DROP POLICY IF EXISTS "Students can view and update own profile" ON public.students;
-- DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
-- DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;
-- DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
-- ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
--
-- -- study_sessions
-- DROP POLICY IF EXISTS "Anyone authenticated can view study sessions" ON public.study_sessions;
-- ALTER TABLE public.study_sessions DISABLE ROW LEVEL SECURITY;
--
-- -- subjects
-- DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON public.subjects;
-- ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
--
-- -- study_content_types
-- DROP POLICY IF EXISTS "Anyone authenticated can view study content types" ON public.study_content_types;
-- ALTER TABLE public.study_content_types DISABLE ROW LEVEL SECURITY;
--
-- -- problem_counts
-- DROP POLICY IF EXISTS "Anyone authenticated can view problem counts" ON public.problem_counts;
-- ALTER TABLE public.problem_counts DISABLE ROW LEVEL SECURITY;
--
-- -- インデックス削除
-- DROP INDEX IF EXISTS idx_parent_child_relations_parent_id;
-- DROP INDEX IF EXISTS idx_parent_child_relations_student_id;
-- DROP INDEX IF EXISTS idx_parents_user_id;
-- DROP INDEX IF EXISTS idx_students_user_id;
