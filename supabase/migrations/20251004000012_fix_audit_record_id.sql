-- ============================================================================
-- 12: 監査ログ record_id 型修正
-- ============================================================================
-- 作成日: 2025-10-06
-- 説明: UUID主キーを扱えるよう audit_logs.record_id を TEXT に変更

-- ----------------------------------------------------------------------------
-- record_id カラムを TEXT に変更
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs
ALTER COLUMN record_id TYPE TEXT USING record_id::text;

COMMENT ON COLUMN public.audit_logs.record_id IS '監査対象レコードのID (UUID/数値を文字列として保持)';

-- ----------------------------------------------------------------------------
-- 監査トリガー関数を再作成 (UUID対応)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_old_data JSONB;
  v_new_data JSONB;
  v_record_id TEXT;
BEGIN
  -- 現在のユーザー情報取得
  v_user_id := auth.uid();

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- 操作別データ設定
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(OLD)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(NEW)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
  ELSIF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(NEW)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
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
    v_record_id,
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

COMMENT ON FUNCTION audit_trigger_func IS '汎用監査トリガー関数 (UUID/数値主キー対応版)';

-- ----------------------------------------------------------------------------
-- 完了通知
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'audit_logs.record_id を TEXT 型に変更しました';
  RAISE NOTICE 'audit_trigger_func を UUID 対応に更新しました';
END $$;
