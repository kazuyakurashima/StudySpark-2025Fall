-- ============================================================================
-- 08: 監査ログテーブル
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: システム監査ログのテーブルとトリガー

-- ----------------------------------------------------------------------------
-- audit_logs: 監査ログ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,

  -- 操作情報
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id BIGINT,

  -- 操作者
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role user_role,

  -- 変更内容
  old_data JSONB,
  new_data JSONB,

  -- メタデータ
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);

-- RLS有効化 (管理者のみアクセス)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.audit_logs IS 'システム監査ログ (全ての重要操作を記録)';
COMMENT ON COLUMN public.audit_logs.old_data IS '変更前のデータ (JSON形式)';
COMMENT ON COLUMN public.audit_logs.new_data IS '変更後のデータ (JSON形式)';

-- ----------------------------------------------------------------------------
-- Generic Audit Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- 現在のユーザー情報取得
  v_user_id := auth.uid();

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- 操作別にデータ設定
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  -- 監査ログ挿入
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    record_id,
    user_id,
    user_role,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    v_user_id,
    v_user_role,
    v_old_data,
    v_new_data
  );

  -- 操作続行
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_func IS '汎用監査トリガー関数 (重要テーブルに適用)';

-- ----------------------------------------------------------------------------
-- Apply Audit Triggers to Critical Tables
-- ----------------------------------------------------------------------------

-- profiles
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- students
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- parents
CREATE TRIGGER audit_parents
  AFTER INSERT OR UPDATE OR DELETE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- coaches
CREATE TRIGGER audit_coaches
  AFTER INSERT OR UPDATE OR DELETE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- admins
CREATE TRIGGER audit_admins
  AFTER INSERT OR UPDATE OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- invitation_codes
CREATE TRIGGER audit_invitation_codes
  AFTER INSERT OR UPDATE OR DELETE ON public.invitation_codes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- parent_child_relations
CREATE TRIGGER audit_parent_child_relations
  AFTER INSERT OR UPDATE OR DELETE ON public.parent_child_relations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- coach_student_relations
CREATE TRIGGER audit_coach_student_relations
  AFTER INSERT OR UPDATE OR DELETE ON public.coach_student_relations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- test_goals (目標変更履歴)
CREATE TRIGGER audit_test_goals
  AFTER INSERT OR UPDATE OR DELETE ON public.test_goals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- test_results (実績変更履歴)
CREATE TRIGGER audit_test_results
  AFTER INSERT OR UPDATE OR DELETE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ----------------------------------------------------------------------------
-- Data Retention: 古い監査ログの削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 1年以上前の監査ログを削除
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS '1年以上前の監査ログを削除 (バッチ処理で定期実行)';

-- ----------------------------------------------------------------------------
-- Data Retention: 古いAIキャッシュの削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 30日以上アクセスされていないキャッシュを削除
  DELETE FROM public.ai_cache
  WHERE last_accessed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_ai_cache IS '30日以上アクセスされていないAIキャッシュを削除';

-- ----------------------------------------------------------------------------
-- Data Retention: 古い週次分析の削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_weekly_analysis()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 6週間以上前の週次分析を削除
  DELETE FROM public.weekly_analysis
  WHERE week_start_date < NOW() - INTERVAL '6 weeks';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_weekly_analysis IS '6週間以上前の週次分析を削除';

-- ----------------------------------------------------------------------------
-- Data Retention: 古い通知の削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 有効期限切れまたは60日以上前の既読通知を削除
  DELETE FROM public.notifications
  WHERE (expires_at IS NOT NULL AND expires_at < NOW())
     OR (is_read = true AND read_at < NOW() - INTERVAL '60 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notifications IS '期限切れまたは古い既読通知を削除';

-- ----------------------------------------------------------------------------
-- Master Cleanup Function (バッチ処理で呼び出し)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION run_data_retention_cleanup()
RETURNS TABLE(
  cleanup_type VARCHAR,
  deleted_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT 'audit_logs'::VARCHAR, cleanup_old_audit_logs();
  RETURN QUERY SELECT 'ai_cache'::VARCHAR, cleanup_old_ai_cache();
  RETURN QUERY SELECT 'weekly_analysis'::VARCHAR, cleanup_old_weekly_analysis();
  RETURN QUERY SELECT 'notifications'::VARCHAR, cleanup_old_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION run_data_retention_cleanup IS 'データ保持ポリシーに基づく一括削除処理 (毎週日曜0時実行)';
