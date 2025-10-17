-- ============================================================================
-- プロフィール自動作成トリガー修正（エラーハンドリング強化）
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- ロールの取得（デフォルト: student）
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'student'::user_role;
    RAISE WARNING 'Failed to parse role from metadata, using default: student. Error: %', SQLERRM;
  END;

  -- プロフィールの作成
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- エラーをログに出力して、ユーザー作成を失敗させる
  RAISE EXCEPTION 'Failed to create profile for user %: %', NEW.id, SQLERRM;
END;
$$;

-- トリガー再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- コメント
COMMENT ON FUNCTION public.handle_new_user() IS 'auth.usersに新規ユーザーが作成されたときにpublic.profilesを自動作成（エラーハンドリング強化版）';
