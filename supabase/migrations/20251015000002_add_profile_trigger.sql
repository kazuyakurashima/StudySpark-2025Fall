-- ============================================================================
-- プロフィール自動作成トリガー
-- ============================================================================
-- 新しいユーザーがauth.usersに作成されたときに、自動的にpublic.profilesを作成する

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成（既存の場合は削除して再作成）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- コメント
COMMENT ON FUNCTION public.handle_new_user() IS 'auth.usersに新規ユーザーが作成されたときにpublic.profilesを自動作成';
