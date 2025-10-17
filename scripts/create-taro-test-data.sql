-- Create test user "たろう" with study logs to test JST study_date

-- 1. Create auth user
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
  'taro@test.com',
  crypt('password123', gen_salt('bf')),
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

-- 2. Create profile
INSERT INTO profiles (
  id,
  role,
  display_name,
  avatar,
  setup_completed,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'student',
  'たろう',
  'student1',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create student
INSERT INTO students (
  id,
  user_id,
  login_id,
  full_name,
  furigana,
  grade,
  course,
  created_at,
  updated_at
) VALUES (
  3,
  '11111111-1111-1111-1111-111111111111',
  'student1',
  '山田太郎',
  'ヤマダタロウ',
  6,
  'A',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  login_id = EXCLUDED.login_id,
  full_name = EXCLUDED.full_name,
  furigana = EXCLUDED.furigana,
  grade = EXCLUDED.grade,
  course = EXCLUDED.course;

-- 4. Create parent
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
  is_super_admin
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'taro-parent@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (
  id,
  role,
  display_name,
  avatar,
  setup_completed
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'parent',
  '太郎の保護者',
  'parent1',
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO parents (
  id,
  user_id,
  email,
  full_name
) VALUES (
  1,
  '22222222-2222-2222-2222-222222222222',
  'taro-parent@test.com',
  '山田一郎'
) ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

-- 5. Link parent-child
INSERT INTO parent_child_relations (
  parent_id,
  student_id,
  relation_type
) VALUES (
  1,
  3,
  'mother'
) ON CONFLICT (parent_id, student_id) DO NOTHING;

-- 6. Create study session for Oct 14
INSERT INTO study_sessions (
  id,
  student_id,
  study_week_id,
  started_at,
  ended_at,
  created_at,
  updated_at
) VALUES (
  100,
  3,
  (SELECT id FROM study_weeks WHERE grade = 6 AND week_number = 8 LIMIT 1),
  '2025-10-14 10:00:00+00',
  '2025-10-14 11:00:00+00',
  '2025-10-14 10:00:00+00',
  '2025-10-14 11:00:00+00'
) ON CONFLICT (id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  study_week_id = EXCLUDED.study_week_id;

-- 7. Create study logs for Oct 14 (UTC evening = JST Oct 15 early morning)
-- These should have study_date = 2025-10-15 in JST

-- logged_at: 2025-10-14 15:36:31 UTC = 2025-10-15 00:36:31 JST
INSERT INTO study_logs (
  student_id,
  session_id,
  subject_id,
  study_content_type_id,
  correct_count,
  total_problems,
  logged_at,
  created_at,
  updated_at
) VALUES (
  3,
  100,
  (SELECT id FROM subjects WHERE name = '理科' LIMIT 1),
  (SELECT id FROM study_content_types WHERE grade = 6 AND subject_id = (SELECT id FROM subjects WHERE name = '理科' LIMIT 1) LIMIT 1),
  16,
  16,
  '2025-10-14 15:36:31+00',
  '2025-10-14 15:36:31+00',
  '2025-10-14 15:36:31+00'
);

-- logged_at: 2025-10-14 16:40:24 UTC = 2025-10-15 01:40:24 JST
INSERT INTO study_logs (
  student_id,
  session_id,
  subject_id,
  study_content_type_id,
  correct_count,
  total_problems,
  logged_at,
  created_at,
  updated_at
) VALUES (
  3,
  100,
  (SELECT id FROM subjects WHERE name = '国語' LIMIT 1),
  (SELECT id FROM study_content_types WHERE grade = 6 AND subject_id = (SELECT id FROM subjects WHERE name = '国語' LIMIT 1) LIMIT 1),
  39,
  40,
  '2025-10-14 16:40:24+00',
  '2025-10-14 16:25:18+00',
  '2025-10-14 16:25:18+00'
);

-- logged_at: 2025-10-14 16:41:31 UTC = 2025-10-15 01:41:31 JST
INSERT INTO study_logs (
  student_id,
  session_id,
  subject_id,
  study_content_type_id,
  correct_count,
  total_problems,
  logged_at,
  created_at,
  updated_at
) VALUES (
  3,
  100,
  (SELECT id FROM subjects WHERE name = '社会' LIMIT 1),
  (SELECT id FROM study_content_types WHERE grade = 6 AND subject_id = (SELECT id FROM subjects WHERE name = '社会' LIMIT 1) LIMIT 1),
  5,
  15,
  '2025-10-14 16:41:31+00',
  '2025-10-14 16:41:31+00',
  '2025-10-14 16:41:31+00'
);

SELECT 'Test data created successfully!' as status;
