-- ============================================================================
-- 20251102000002_add_profiles_rls_for_parents_coaches.sql
-- 説明: Phase 2 修正 - profiles テーブルへの保護者/指導者アクセス権追加
-- 目的: 保護者が子供のprofiles、指導者が担当生徒のprofilesを閲覧可能に
-- ============================================================================

-- ================================
-- profiles テーブル
-- ================================

-- 既存ポリシーを削除（もしあれば）
DO $$
BEGIN
  DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- 保護者: 自分の子供のプロフィールを閲覧
CREATE POLICY "Parents can view children profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT s.user_id
      FROM public.students s
      JOIN public.parent_child_relations pcr ON pcr.student_id = s.id
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 指導者: 担当生徒のプロフィールを閲覧
CREATE POLICY "Coaches can view assigned students profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT s.user_id
      FROM public.students s
      JOIN public.coach_student_relations csr ON csr.student_id = s.id
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
--
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
-- DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;
