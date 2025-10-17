-- ============================================================================
-- STEP 3: profiles, students, parentsレコードを作成
-- ============================================================================
-- 前提: STEP 2でauth.usersが作成済み
-- 注意: 以下の 'UUID_HERE' を実際のauth.users.idに置き換えてください

-- ============================================================================
-- hikaru6の完成
-- ============================================================================

-- hikaru6のprofile作成
-- STEP 2で取得したhikaru6のUUIDに置き換えてください
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  'HIKARU6_UUID_HERE', -- ★ここを置き換え
  'student',
  '星野 光',
  'ユーザー5678',
  'student2',
  '#3B82F6',
  NOW(),
  NOW()
);

-- hikaru6のstudentレコード作成
INSERT INTO public.students (user_id, full_name, furigana, login_id, grade, course, created_at, updated_at)
VALUES (
  'HIKARU6_UUID_HERE', -- ★ここを置き換え
  '星野 光',
  'ほしの ひかる',
  'hikaru6',
  6,
  'C',
  NOW(),
  NOW()
);

-- ============================================================================
-- akira5の完成
-- ============================================================================

-- akira5のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  'AKIRA5_UUID_HERE', -- ★ここを置き換え
  'student',
  '星野 明',
  'ユーザー9012',
  'student3',
  '#3B82F6',
  NOW(),
  NOW()
);

-- akira5のstudentレコード作成
INSERT INTO public.students (user_id, full_name, furigana, login_id, grade, course, created_at, updated_at)
VALUES (
  'AKIRA5_UUID_HERE', -- ★ここを置き換え
  '星野 明',
  'ほしの あきら',
  'akira5',
  5,
  'A',
  NOW(),
  NOW()
);

-- ============================================================================
-- parent1（青空太郎）の完成
-- ============================================================================

-- parent1のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  'PARENT1_UUID_HERE', -- ★ここを置き換え
  'parent',
  '青空 太郎',
  '保護者3456',
  'parent1',
  '#3B82F6',
  NOW(),
  NOW()
);

-- parent1のparentレコード作成
INSERT INTO public.parents (user_id, full_name, furigana, created_at, updated_at)
VALUES (
  'PARENT1_UUID_HERE', -- ★ここを置き換え
  '青空 太郎',
  'あおぞら たろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- parent2（星野一朗）の完成
-- ============================================================================

-- parent2のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  'PARENT2_UUID_HERE', -- ★ここを置き換え
  'parent',
  '星野 一朗',
  '保護者7890',
  'parent2',
  '#3B82F6',
  NOW(),
  NOW()
);

-- parent2のparentレコード作成
INSERT INTO public.parents (user_id, full_name, furigana, created_at, updated_at)
VALUES (
  'PARENT2_UUID_HERE', -- ★ここを置き換え
  '星野 一朗',
  'ほしの いちろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- 確認クエリ
-- ============================================================================

SELECT 'Profiles:' as table_name;
SELECT id, role, display_name, nickname FROM public.profiles ORDER BY created_at;

SELECT 'Students:' as table_name;
SELECT id, user_id, full_name, login_id, grade, course FROM public.students ORDER BY grade, login_id;

SELECT 'Parents:' as table_name;
SELECT id, user_id, full_name FROM public.parents ORDER BY full_name;
