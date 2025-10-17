-- プロフィールトリガーを修正してavatar_id, nickname, theme_colorを自動設定

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role user_role;
  default_avatar_id TEXT;
  random_suffix TEXT;
BEGIN
  -- ロールの取得（デフォルト: student）
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'student'::user_role;
    RAISE WARNING 'Failed to parse role from metadata, using default: student. Error: %', SQLERRM;
  END;

  -- ロール別のデフォルトavatar_idを設定
  CASE user_role
    WHEN 'student' THEN default_avatar_id := 'student1';
    WHEN 'parent' THEN default_avatar_id := 'parent1';
    WHEN 'coach' THEN default_avatar_id := 'parent1';
    WHEN 'admin' THEN default_avatar_id := 'parent1';
    ELSE default_avatar_id := 'student1';
  END CASE;

  -- ランダムな4桁数字を生成
  random_suffix := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- プロフィールの作成
  INSERT INTO public.profiles (
    id,
    role,
    display_name,
    nickname,
    avatar_id,
    theme_color
  )
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    CASE user_role
      WHEN 'student' THEN 'ユーザー' || random_suffix
      WHEN 'parent' THEN '保護者' || random_suffix
      ELSE '指導者' || random_suffix
    END,
    default_avatar_id,
    '#3B82F6'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- エラーをログに出力して、ユーザー作成を失敗させる
  RAISE EXCEPTION 'Failed to create profile for user %: %', NEW.id, SQLERRM;
END;
$function$;
