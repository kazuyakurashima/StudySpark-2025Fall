-- 残り3ユーザーをauth.usersに作成
-- Supabase Admin APIの代わりにSQL直接作成

-- akira5 (星野 明)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'akira5@studyspark.local',
  crypt('demo2025', gen_salt('bf')),
  NOW(),
  '{"role":"student","login_id":"akira5","full_name":"星野 明","email_verified":true}'::jsonb,
  NOW(),
  NOW(),
  '',
  'authenticated',
  'authenticated'
);

-- parent1 (青空 太郎)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'toshin.hitachi+test001@gmail.com',
  crypt('Testdemo2025', gen_salt('bf')),
  NOW(),
  '{"role":"parent","full_name":"青空 太郎","email_verified":true}'::jsonb,
  NOW(),
  NOW(),
  '',
  'authenticated',
  'authenticated'
);

-- parent2 (星野 一朗)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'toshin.hitachi+test002@gmail.com',
  crypt('Testdemo2025', gen_salt('bf')),
  NOW(),
  '{"role":"parent","full_name":"星野 一朗","email_verified":true}'::jsonb,
  NOW(),
  NOW(),
  '',
  'authenticated',
  'authenticated'
);

-- 確認: 全5ユーザーを表示
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'login_id' as login_id,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
ORDER BY email;
