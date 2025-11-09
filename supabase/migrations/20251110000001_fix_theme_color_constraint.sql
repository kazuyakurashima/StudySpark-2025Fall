-- テーマカラーの制約を修正し、"default"値を許可する
-- theme_color_format_check 制約を削除して、新しい制約を追加

-- 1. 既存の制約を削除
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS theme_color_format_check;

-- 2. 新しい制約を追加（HEX形式または"default"を許可）
ALTER TABLE profiles
  ADD CONSTRAINT theme_color_format_check
  CHECK (theme_color = 'default' OR theme_color ~ '^#[0-9A-Fa-f]{6}$');

-- 3. コメントを更新
COMMENT ON COLUMN profiles.theme_color IS 'テーマカラー（HEX形式または"default"）';
