-- 不足しているレコードを作成

-- ============================================================================
-- 1. hikaru6のdisplay_nameを修正
-- ============================================================================
UPDATE public.profiles
SET display_name = '星野 光'
WHERE id = '02720550-3dce-4846-b000-7a354f8f6c40';

-- ============================================================================
-- 2. hikaru6のstudentレコード作成
-- ============================================================================
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
-- 3. akira5のstudentレコード作成
-- ============================================================================
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
-- 4. parent1（青空太郎）のparentレコード作成
-- ============================================================================
INSERT INTO public.parents (user_id, full_name, furigana, created_at, updated_at)
VALUES (
  '6d7dad4b-c28e-441b-b59d-5b371fa0241c',
  '青空 太郎',
  'あおぞら たろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- 5. parent2（星野一朗）のparentレコード作成
-- ============================================================================
INSERT INTO public.parents (user_id, full_name, furigana, created_at, updated_at)
VALUES (
  '37d1990d-9450-41e8-8ef3-d4ce1e22ec67',
  '星野 一朗',
  'ほしの いちろう',
  NOW(),
  NOW()
);

-- ============================================================================
-- 確認
-- ============================================================================
SELECT 'Students (should be 3):' as check_result, COUNT(*) as count FROM public.students;
SELECT login_id, full_name, grade, course FROM public.students ORDER BY grade, login_id;

SELECT 'Parents (should be 2):' as check_result, COUNT(*) as count FROM public.parents;
SELECT full_name FROM public.parents ORDER BY full_name;

SELECT 'hikaru6 profile fixed:' as check_result;
SELECT display_name FROM public.profiles WHERE id = '02720550-3dce-4846-b000-7a354f8f6c40';
