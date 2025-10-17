-- 本番環境のauth.usersを確認
-- hana6がSupabase側で正しく認証できる状態か確認

-- 1. hana6のauth.userが存在するか
SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  raw_user_meta_data
FROM auth.users
WHERE email = 'hana6@studyspark.local';

-- 2. hana6のprofileが存在するか
SELECT
  id,
  role,
  display_name,
  setup_completed
FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'hana6@studyspark.local'
);

-- 3. パスワードハッシュが正しく設定されているか確認
SELECT
  email,
  LENGTH(encrypted_password) as password_hash_length,
  encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%' as is_bcrypt_hash
FROM auth.users
WHERE email = 'hana6@studyspark.local';
