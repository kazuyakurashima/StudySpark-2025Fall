-- ============================================================================
-- 20251105000001_fix_rls_infinite_recursion.sql
-- 説明: RLS無限再帰問題の修正（SECURITY DEFINER関数を使用）
-- 問題: parent_child_relationsとstudentsテーブル間で循環参照が発生
-- 解決: SECURITY DEFINER関数でRLSをバイパスし、循環を断ち切る
-- ============================================================================

-- ================================
-- SECURITY DEFINER関数の作成
-- ================================
-- 現在ログイン中のユーザーが生徒の場合、そのstudent_idを返す
-- RLSをバイパスするため、studentsテーブルへのアクセスで無限再帰を防ぐ
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.students
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 関数へのアクセス権限を付与
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated;

-- 関数にコメント追加
COMMENT ON FUNCTION public.current_student_id() IS
'現在のユーザーのstudent_idを返す（RLSバイパス）。生徒でない場合はNULLを返す。';

-- ================================
-- 保護者用のヘルパー関数（オプション）
-- ================================
-- 現在ログイン中のユーザーが保護者の場合、そのparent_idを返す
CREATE OR REPLACE FUNCTION public.current_parent_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.parents
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 関数へのアクセス権限を付与
GRANT EXECUTE ON FUNCTION public.current_parent_id() TO authenticated;

-- 関数にコメント追加
COMMENT ON FUNCTION public.current_parent_id() IS
'現在のユーザーのparent_idを返す（RLSバイパス）。保護者でない場合はNULLを返す。';

-- ================================
-- parent_child_relationsのRLSポリシー修正
-- ================================

-- 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "Students can view own parent relations" ON public.parent_child_relations;
DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_child_relations;

-- 新しいポリシー1: 生徒は自分の親との関係を閲覧（関数を使用）
CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    -- current_student_id()がNULLでない（＝生徒である）かつ、
    -- 自分のstudent_idと一致する場合のみアクセス可能
    public.current_student_id() IS NOT NULL
    AND parent_child_relations.student_id = public.current_student_id()
  );

-- 新しいポリシー2: 保護者は自分の子供との関係を閲覧（関数を使用）
CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    -- current_parent_id()がNULLでない（＝保護者である）かつ、
    -- 自分のparent_idと一致する場合のみアクセス可能
    public.current_parent_id() IS NOT NULL
    AND parent_child_relations.parent_id = public.current_parent_id()
  );

-- ================================
-- 検証用コメント
-- ================================
-- この修正により：
-- 1. students → parent_child_relations: studentsのRLSがparent_child_relationsを参照（OK）
-- 2. parent_child_relations → 関数: SECURITY DEFINERでRLSをバイパス（無限再帰を防ぐ）
-- 3. 関数 → students: RLSを通らずに直接アクセス（循環を断ち切る）

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP FUNCTION IF EXISTS public.current_student_id();
-- DROP FUNCTION IF EXISTS public.current_parent_id();
--
-- -- 元のポリシーを復元（ただし無限再帰が再発する）
-- DROP POLICY IF EXISTS "Students can view own parent relations" ON public.parent_child_relations;
-- DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_child_relations;
--
-- CREATE POLICY "Parents can view own children relations"
--   ON public.parent_child_relations FOR SELECT TO authenticated
--   USING (
--     parent_id IN (
--       SELECT id FROM public.parents WHERE user_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Students can view own parent relations"
--   ON public.parent_child_relations FOR SELECT TO authenticated
--   USING (
--     student_id IN (
--       SELECT id FROM public.students WHERE user_id = auth.uid()
--     )
--   );