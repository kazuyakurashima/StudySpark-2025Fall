-- ============================================================================
-- 20251105000002_fix_profiles_rls_recursion.sql
-- 説明: profiles RLSの無限再帰問題を修正
-- 問題: profiles → students → parent_child_relations で間接的な循環参照
-- 解決: profiles RLSもSECURITY DEFINER関数を使用
-- ============================================================================

-- ================================
-- profiles用のRLS修正
-- ================================

-- 既存のprofiles RLSポリシーを削除
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;

-- 新しいポリシー1: 保護者は子供のprofilesを閲覧（関数経由）
-- students経由での参照を避け、parent_child_relations + 関数を使用
CREATE POLICY "Parents can view children profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- 自分が保護者である場合のみ評価
    public.current_parent_id() IS NOT NULL
    AND id IN (
      -- parent_child_relationsから直接student_id → user_idを取得
      -- studentsテーブルのRLSを発動させない
      SELECT s.user_id
      FROM public.parent_child_relations pcr
      JOIN public.students s ON s.id = pcr.student_id
      WHERE pcr.parent_id = public.current_parent_id()
    )
  );

-- 新しいポリシー2: 指導者は担当生徒のprofilesを閲覧（関数経由）
-- コーチ用のヘルパー関数も作成
CREATE OR REPLACE FUNCTION public.current_coach_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.coaches
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 関数へのアクセス権限を付与
GRANT EXECUTE ON FUNCTION public.current_coach_id() TO authenticated;

-- 関数にコメント追加
COMMENT ON FUNCTION public.current_coach_id() IS
'現在のユーザーのcoach_idを返す（RLSバイパス）。指導者でない場合はNULLを返す。';

-- 指導者用のポリシーを作成
CREATE POLICY "Coaches can view assigned students profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- 自分が指導者である場合のみ評価
    public.current_coach_id() IS NOT NULL
    AND id IN (
      SELECT s.user_id
      FROM public.coach_student_relations csr
      JOIN public.students s ON s.id = csr.student_id
      WHERE csr.coach_id = public.current_coach_id()
    )
  );

-- ================================
-- 検証用コメント
-- ================================
-- この修正により：
-- 1. profiles RLS: current_parent_id()/current_coach_id()関数を使用
-- 2. 関数がRLSをバイパスするため、studentsへの参照で無限再帰が発生しない
-- 3. parent_child_relationsのJOINは関数評価後なのでRLS評価済み

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP FUNCTION IF EXISTS public.current_coach_id();
-- DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
-- DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;
--
-- -- 元のポリシーを復元（ただし無限再帰が再発する）
-- CREATE POLICY "Parents can view children profiles"
--   ON public.profiles FOR SELECT TO authenticated
--   USING (
--     id IN (
--       SELECT s.user_id
--       FROM public.students s
--       JOIN public.parent_child_relations pcr ON pcr.student_id = s.id
--       JOIN public.parents p ON p.id = pcr.parent_id
--       WHERE p.user_id = auth.uid()
--     )
--   );