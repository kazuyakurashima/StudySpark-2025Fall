-- ============================================================================
-- 20251105000003_complete_rls_fix.sql
-- 説明: RLS無限再帰問題の完全修正
-- 戦略: すべてのテーブル参照をSECURITY DEFINER関数内に移動
-- ============================================================================

-- ================================
-- 既存のヘルパー関数（確認用）
-- ================================
-- current_parent_id(), current_student_id(), current_coach_id() は既存

-- ================================
-- 新規: user_id リストを返す関数群
-- ================================

-- 保護者の子供のuser_idリストを返す（profiles/students RLS用）
CREATE OR REPLACE FUNCTION public.get_children_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.user_id
  FROM public.parent_child_relations pcr
  JOIN public.students s ON s.id = pcr.student_id
  JOIN public.parents p ON p.id = pcr.parent_id
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_children_user_ids() TO authenticated;

COMMENT ON FUNCTION public.get_children_user_ids() IS
'現在の保護者の子供のuser_idリストを返す（RLSバイパス、profiles/students用）';

-- 指導者の担当生徒のuser_idリストを返す（profiles/students RLS用）
CREATE OR REPLACE FUNCTION public.get_assigned_students_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.user_id
  FROM public.coach_student_relations csr
  JOIN public.students s ON s.id = csr.student_id
  JOIN public.coaches c ON c.id = csr.coach_id
  WHERE c.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_students_user_ids() TO authenticated;

COMMENT ON FUNCTION public.get_assigned_students_user_ids() IS
'現在の指導者の担当生徒のuser_idリストを返す（RLSバイパス、profiles/students用）';

-- 保護者の子供のstudent_idリストを返す（students RLS用）
CREATE OR REPLACE FUNCTION public.get_children_student_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pcr.student_id
  FROM public.parent_child_relations pcr
  JOIN public.parents p ON p.id = pcr.parent_id
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_children_student_ids() TO authenticated;

COMMENT ON FUNCTION public.get_children_student_ids() IS
'現在の保護者の子供のstudent_idリストを返す（RLSバイパス、students RLS用）';

-- 指導者の担当生徒のstudent_idリストを返す（students RLS用）
CREATE OR REPLACE FUNCTION public.get_assigned_student_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT csr.student_id
  FROM public.coach_student_relations csr
  JOIN public.coaches c ON c.id = csr.coach_id
  WHERE c.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_student_ids() TO authenticated;

COMMENT ON FUNCTION public.get_assigned_student_ids() IS
'現在の指導者の担当生徒のstudent_idリストを返す（RLSバイパス、students RLS用）';

-- ================================
-- students テーブルのRLS完全修正
-- ================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;

-- 新ポリシー: 保護者は子供のstudentsレコードを閲覧（関数のみ使用）
CREATE POLICY "Parents can view children profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    -- get_children_student_ids()はSECURITY DEFINERなので、
    -- parent_child_relationsへの参照で無限再帰が発生しない
    id IN (SELECT public.get_children_student_ids())
  );

-- 新ポリシー: 指導者は担当生徒のstudentsレコードを閲覧（関数のみ使用）
CREATE POLICY "Coaches can view assigned students profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_assigned_student_ids())
  );

-- ================================
-- profiles テーブルのRLS完全修正
-- ================================

-- 既存ポリシーを削除（20251105000002で作成したもの）
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;

-- 新ポリシー: 保護者は子供のprofilesを閲覧（関数のみ使用）
CREATE POLICY "Parents can view children profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- get_children_user_ids()はSECURITY DEFINERなので、
    -- students/parent_child_relationsへの参照で無限再帰が発生しない
    id IN (SELECT public.get_children_user_ids())
  );

-- 新ポリシー: 指導者は担当生徒のprofilesを閲覧（関数のみ使用）
CREATE POLICY "Coaches can view assigned students profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_assigned_students_user_ids())
  );

-- ================================
-- 検証用コメント
-- ================================
-- この修正により：
-- 1. profiles RLS: get_children_user_ids()のみを呼ぶ（関数内でJOIN完結）
-- 2. students RLS: get_children_student_ids()のみを呼ぶ（関数内でJOIN完結）
-- 3. parent_child_relations RLS: current_parent_id()のみを呼ぶ（既存）
-- 4. すべての関数がSECURITY DEFINERなのでRLSをバイパス
-- 5. 循環参照が完全に解消される

-- ================================
-- パフォーマンス考慮
-- ================================
-- 関数がSETOF型を返すため、PostgreSQLが最適化可能
-- 必要に応じてインデックスが活用される：
-- - idx_parent_child_relations_parent_id
-- - idx_parents_user_id
-- - idx_students_user_id
-- これらは20251102000001で既に作成済み

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP FUNCTION IF EXISTS public.get_children_user_ids();
-- DROP FUNCTION IF EXISTS public.get_assigned_students_user_ids();
-- DROP FUNCTION IF EXISTS public.get_children_student_ids();
-- DROP FUNCTION IF EXISTS public.get_assigned_student_ids();
--
-- -- ポリシーを以前の状態に戻す（ただし無限再帰が再発する可能性あり）
-- DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
-- DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;
-- DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
-- DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;