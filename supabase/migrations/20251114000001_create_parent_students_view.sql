-- ============================================================================
-- 20251114000001_create_parent_students_view.sql
-- 説明: parent_studentsビューの作成
-- 目的: PostgRESTで parent_students!inner() リレーションを使えるようにする
-- ============================================================================

-- parent_studentsビューを作成
-- これにより、parent_child_relationsテーブルを parent_students としてアクセス可能にする
CREATE OR REPLACE VIEW public.parent_students AS
SELECT
  pcr.id,
  pcr.parent_id,
  pcr.student_id,
  pcr.relation_type,
  pcr.created_at,
  s.user_id,
  s.login_id,
  s.full_name,
  s.grade,
  s.course,
  s.created_at AS student_created_at,
  s.updated_at AS student_updated_at
FROM public.parent_child_relations pcr
JOIN public.students s ON s.id = pcr.student_id;

-- ビューにRLSポリシーを適用
ALTER VIEW public.parent_students SET (security_invoker = on);

-- コメント追加
COMMENT ON VIEW public.parent_students IS '保護者-生徒関係のビュー。PostgREST joinクエリ用。';

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
--
-- DROP VIEW IF EXISTS public.parent_students;
