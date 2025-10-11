-- システム設定テーブルの作成
-- 管理者がアプリケーション全体の設定を管理するためのKey-Valueストア

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー: 管理者のみ閲覧・編集可能
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者はシステム設定を閲覧可能"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "管理者はシステム設定を編集可能"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- 初期設定データの挿入
INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('weekly_analysis_enabled', 'true'),
  ('encouragement_enabled', 'true'),
  ('reflection_enabled', 'true'),
  ('audit_log_retention_days', '365'),
  ('student_data_retention_days', '730')
ON CONFLICT (key) DO NOTHING;

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- コメント
COMMENT ON TABLE system_settings IS 'システム全体の設定を管理するKey-Valueストア';
COMMENT ON COLUMN system_settings.key IS '設定キー（一意）';
COMMENT ON COLUMN system_settings.value IS '設定値（文字列形式）';
COMMENT ON COLUMN system_settings.updated_at IS '最終更新日時';
COMMENT ON COLUMN system_settings.created_at IS '作成日時';
