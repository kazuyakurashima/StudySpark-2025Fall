-- ============================================================================
-- 20260325000002_fix_function_search_path.sql
-- Supabase Security Advisor: function_search_path_mutable 修正
--
-- SECURITY DEFINER 関数に SET search_path = public を追加（9件）
-- SECURITY INVOKER 関数に SET search_path = public を追加（15件）
-- 参考: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- ============================================================
-- SECURITY DEFINER 関数（優先度: 高）
-- search_path が固定されていないと、悪意あるスキーマ注入の攻撃対象になりうる
-- ============================================================

-- 1. cleanup_old_audit_logs
ALTER FUNCTION public.cleanup_old_audit_logs() SET search_path = public;

-- 2. cleanup_old_ai_cache
ALTER FUNCTION public.cleanup_old_ai_cache() SET search_path = public;

-- 3. cleanup_old_weekly_analysis
ALTER FUNCTION public.cleanup_old_weekly_analysis() SET search_path = public;

-- 4. cleanup_old_notifications
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = public;

-- 5. run_data_retention_cleanup
ALTER FUNCTION public.run_data_retention_cleanup() SET search_path = public;

-- 6. register_parent_with_children
ALTER FUNCTION public.register_parent_with_children(
  UUID, VARCHAR(100), VARCHAR(100), JSONB
) SET search_path = public;

-- ============================================================
-- SECURITY INVOKER 関数（優先度: 中）
-- 直接の攻撃リスクは低いが、Advisor 警告をクリアにする
-- ============================================================

-- 7. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 8. generate_student_login_id
ALTER FUNCTION public.generate_student_login_id() SET search_path = public;

-- 9. course_rank
ALTER FUNCTION public.course_rank(public.course_level) SET search_path = public;

-- 10. create_notification
ALTER FUNCTION public.create_notification(
  UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, BIGINT, TIMESTAMPTZ
) SET search_path = public;

-- 11. notify_new_encouragement
ALTER FUNCTION public.notify_new_encouragement() SET search_path = public;

-- 12. audit_trigger_func
ALTER FUNCTION public.audit_trigger_func() SET search_path = public;

-- 13. update_system_settings_updated_at
ALTER FUNCTION public.update_system_settings_updated_at() SET search_path = public;

-- 14. update_student_streak
ALTER FUNCTION public.update_student_streak() SET search_path = public;

-- 15. reveal_math_answers
ALTER FUNCTION public.reveal_math_answers(BIGINT, BIGINT) SET search_path = public;

-- 16. lock_answer_session
ALTER FUNCTION public.lock_answer_session(BIGINT, BIGINT, VARCHAR) SET search_path = public;

-- 17. check_exercise_reflection_limit
ALTER FUNCTION public.check_exercise_reflection_limit() SET search_path = public;

-- 18. process_assessment_insert
ALTER FUNCTION public.process_assessment_insert() SET search_path = public;

-- 19. set_modified_by_on_admin_update
ALTER FUNCTION public.set_modified_by_on_admin_update() SET search_path = public;

-- 20. begin_math_retry
ALTER FUNCTION public.begin_math_retry(BIGINT, BIGINT) SET search_path = public;

-- 21. handle_new_user (SECURITY DEFINER、profile trigger)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 22-24. current_*_id (SECURITY DEFINER、RLS ヘルパー)
-- 既存 migration で SET search_path 付きだが、後続で上書きされ proconfig=null
ALTER FUNCTION public.current_student_id() SET search_path = public;
ALTER FUNCTION public.current_parent_id() SET search_path = public;
ALTER FUNCTION public.current_coach_id() SET search_path = public;
