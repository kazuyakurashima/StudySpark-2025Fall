-- プロフィールカスタマイズ機能用のカラム追加
-- nickname, avatar_id, theme_color を追加

-- 1. 新しいカラムを追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6';

-- 2. 既存データの移行（display_name → nickname）
UPDATE profiles
SET nickname = display_name
WHERE nickname IS NULL AND display_name IS NOT NULL;

-- 3. nickname を NOT NULL に設定（デフォルト値付き）
ALTER TABLE profiles
  ALTER COLUMN nickname SET DEFAULT 'ユーザー',
  ALTER COLUMN nickname SET NOT NULL;

-- 4. avatar_id を NOT NULL に設定（ロール別デフォルト値）
-- まず、既存レコードにデフォルト値を設定
UPDATE profiles
SET avatar_id = CASE
  WHEN role = 'student' THEN 'student1'
  WHEN role = 'parent' THEN 'parent1'
  WHEN role = 'coach' THEN 'parent1'
  WHEN role = 'admin' THEN 'parent1'
  ELSE 'student1'
END
WHERE avatar_id IS NULL;

-- avatar_id を NOT NULL に設定
ALTER TABLE profiles
  ALTER COLUMN avatar_id SET NOT NULL;

-- 5. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_id ON profiles(avatar_id);

-- 6. コメントを追加
COMMENT ON COLUMN profiles.nickname IS 'ユーザーのニックネーム（1〜10文字）';
COMMENT ON COLUMN profiles.avatar_id IS 'アバターID（student1〜6, parent1〜6など）';
COMMENT ON COLUMN profiles.theme_color IS 'テーマカラー（HEX形式）';

-- 7. バリデーション用の制約を追加
ALTER TABLE profiles
  ADD CONSTRAINT nickname_length_check CHECK (char_length(nickname) >= 1 AND char_length(nickname) <= 10),
  ADD CONSTRAINT theme_color_format_check CHECK (theme_color ~ '^#[0-9A-Fa-f]{6}$');
