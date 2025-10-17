-- STEP 3: profiles, students, parentsレコードを作成
-- UUIDは実際の値に置き換え済み

-- ============================================================================
-- hikaru6 (星野 光)
-- ============================================================================

-- hikaru6のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  '02720550-3dce-4846-b000-7a354f8f6c40',
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
  '02720550-3dce-4846-b000-7a354f8f6c40',
  '星野 光',
  'ほしの ひかる',
  'hikaru6',
  6,
  'C',
  NOW(),
  NOW()
);

-- ============================================================================
-- akira5 (星野 明)
-- ============================================================================

-- akira5のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  '670007ca-506c-48ab-b596-ad9342acc028',
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
  '670007ca-506c-48ab-b596-ad9342acc028',
  '星野 明',
  'ほしの あきら',
  'akira5',
  5,
  'A',
  NOW(),
  NOW()
);

-- ============================================================================
-- parent1（青空太郎）
-- ============================================================================

-- parent1のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  '6d7dad4b-c28e-441b-b59d-5b371fa0241c',
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
  '6d7dad4b-c28e-441b-b59d-5b371fa0241c',
  '青空 太郎',
  'あおぞら たろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- parent2（星野一朗）
-- ============================================================================

-- parent2のprofile作成
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  '37d1990d-9450-41e8-8ef3-d4ce1e22ec67',
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
  '37d1990d-9450-41e8-8ef3-d4ce1e22ec67',
  '星野 一朗',
  'ほしの いちろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- 確認クエリ
-- ============================================================================

SELECT '=== Profiles ===' as section;
SELECT id, role, display_name, nickname FROM public.profiles ORDER BY created_at;

SELECT '=== Students ===' as section;
SELECT id, user_id, full_name, login_id, grade, course FROM public.students ORDER BY grade, login_id;

SELECT '=== Parents ===' as section;
SELECT id, user_id, full_name FROM public.parents ORDER BY full_name;
