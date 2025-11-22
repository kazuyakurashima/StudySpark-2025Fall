-- ============================================================================
-- 20251123000001_fix_coaching_sessions_rls.sql
-- 説明: coaching_sessions テーブルのRLSポリシーを修正
-- 目的: 指導者がcoaching_sessionsにアクセスする際のRLS無限再帰問題を解消
-- ============================================================================

-- ================================
-- coaching_sessions テーブルのRLS修正
-- ================================

-- 既存の指導者用ポリシーを削除
DROP POLICY IF EXISTS "Coaches can view assigned students coaching sessions" ON public.coaching_sessions;

-- 新ポリシー: 指導者は担当生徒のセッションを閲覧（SECURITY DEFINER関数を使用）
-- get_assigned_student_ids() は 20251105000003_complete_rls_fix.sql で作成済み
CREATE POLICY "Coaches can view assigned students coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

-- ================================
-- coaching_messages テーブルのRLS修正
-- ================================

-- 既存の指導者用ポリシーを削除
DROP POLICY IF EXISTS "Coaches can view assigned students coaching messages" ON public.coaching_messages;

-- 新ポリシー: 指導者は担当生徒のメッセージを閲覧（SECURITY DEFINER関数を使用）
CREATE POLICY "Coaches can view assigned students coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      WHERE cs.id = session_id
        AND cs.student_id IN (SELECT public.get_assigned_student_ids())
    )
  );

-- ================================
-- weekly_analysis テーブルのRLS修正
-- ================================

-- 既存の指導者用ポリシーを削除
DROP POLICY IF EXISTS "Coaches can view assigned students weekly analysis" ON public.weekly_analysis;

-- 新ポリシー: 指導者は担当生徒の週次分析を閲覧（SECURITY DEFINER関数を使用）
CREATE POLICY "Coaches can view assigned students weekly analysis"
  ON public.weekly_analysis
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

-- 指導者が週次分析を書き込みできるようにINSERT/UPDATEポリシーを追加
CREATE POLICY "Coaches can insert weekly analysis for assigned students"
  ON public.weekly_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

CREATE POLICY "Coaches can update weekly analysis for assigned students"
  ON public.weekly_analysis
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (SELECT public.get_assigned_student_ids())
  )
  WITH CHECK (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

-- ================================
-- 保護者用ポリシーも同様に修正
-- ================================

-- coaching_sessions の保護者用ポリシー
DROP POLICY IF EXISTS "Parents can view children coaching sessions" ON public.coaching_sessions;

CREATE POLICY "Parents can view children coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_children_student_ids())
  );

-- coaching_messages の保護者用ポリシー
DROP POLICY IF EXISTS "Parents can view children coaching messages" ON public.coaching_messages;

CREATE POLICY "Parents can view children coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      WHERE cs.id = session_id
        AND cs.student_id IN (SELECT public.get_children_student_ids())
    )
  );

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- -- coaching_sessions
-- DROP POLICY IF EXISTS "Coaches can view assigned students coaching sessions" ON public.coaching_sessions;
-- DROP POLICY IF EXISTS "Parents can view children coaching sessions" ON public.coaching_sessions;
--
-- -- coaching_messages
-- DROP POLICY IF EXISTS "Coaches can view assigned students coaching messages" ON public.coaching_messages;
-- DROP POLICY IF EXISTS "Parents can view children coaching messages" ON public.coaching_messages;
--
-- -- weekly_analysis
-- DROP POLICY IF EXISTS "Coaches can view assigned students weekly analysis" ON public.weekly_analysis;
-- DROP POLICY IF EXISTS "Coaches can insert weekly analysis for assigned students" ON public.weekly_analysis;
-- DROP POLICY IF EXISTS "Coaches can update weekly analysis for assigned students" ON public.weekly_analysis;
--
-- -- 元のポリシーを再作成する場合は 20251004000006_create_coaching.sql を参照
