-- Create test student "たろう" (student1) with minimal setup

-- 1. Create auth user for student
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student1@internal.test',  -- Internal email, not used for login
  crypt('password123', gen_salt('bf')) -- TODO: 本番では環境変数から取得,
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Create profile for student
INSERT INTO profiles (
  id,
  role,
  display_name,
  avatar_url,
  setup_completed,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'student',
  'たろう',
  '/avatars/student1.png',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create student record
INSERT INTO students (
  user_id,
  login_id,
  full_name,
  furigana,
  grade,
  course,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'student1',
  '山田太郎',
  'ヤマダタロウ',
  6,
  'A',
  NOW(),
  NOW()
) ON CONFLICT (login_id) DO NOTHING;

SELECT 'Student "たろう" (student1) created successfully!' as status;
SELECT 'Login with: student1 / password123' as credentials;
