-- ============================================================================
-- 20251114000003_grant_parent_students_view.sql
-- 説明: parent_studentsビューへのアクセス権限付与
-- 目的: PostgRESTがビューにアクセスできるようにする
-- ============================================================================

-- parent_studentsビューにSELECT権限を付与
GRANT SELECT ON public.parent_students TO anon, authenticated, service_role;

-- コメント追加
COMMENT ON VIEW public.parent_students IS '保護者-生徒関係のビュー。PostgREST joinクエリ用。全ロールにSELECT権限付与済み。';

-- ============================================================================
-- 確認用クエリ（実行後に手動確認可能）
-- ============================================================================
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'parent_students';
