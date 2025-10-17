-- ============================================================================
-- STEP 1: hana6のprofileとstudentレコードを作成
-- ============================================================================
-- Supabase Dashboard > SQL Editor で実行してください
-- このSQLはRLSをバイパスします

-- hana6のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  '1f01a511-3045-4a5c-9c1c-115913c630d9',
  'student',
  '青空 花',
  'ユーザー1234',
  'student1',
  '#3B82F6',
  NOW(),
  NOW()
);

-- hana6のstudentレコード作成
INSERT INTO public.students (user_id, full_name, furigana, login_id, grade, course, created_at, updated_at)
VALUES (
  '1f01a511-3045-4a5c-9c1c-115913c630d9',
  '青空 花',
  'あおぞら はな',
  'hana6',
  6,
  'B',
  NOW(),
  NOW()
);

-- 確認
SELECT 'Profile created:' as status, * FROM public.profiles WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
SELECT 'Student created:' as status, * FROM public.students WHERE user_id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
