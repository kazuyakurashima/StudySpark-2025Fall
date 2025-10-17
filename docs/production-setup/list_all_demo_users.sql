-- 本番環境のデモユーザー一覧

-- 1. 全ユーザー（auth.users + profiles）
SELECT
  au.email,
  au.raw_user_meta_data->>'role' as role,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'login_id' as login_id,
  p.display_name,
  p.nickname,
  p.avatar_id,
  p.setup_completed
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY
  CASE au.raw_user_meta_data->>'role'
    WHEN 'student' THEN 1
    WHEN 'parent' THEN 2
    ELSE 3
  END,
  au.email;

-- 2. 生徒の詳細情報
SELECT
  s.id,
  s.full_name,
  s.furigana,
  s.login_id,
  s.grade,
  s.course,
  au.email
FROM public.students s
JOIN auth.users au ON s.user_id = au.id
ORDER BY s.grade, s.login_id;

-- 3. 保護者の詳細情報
SELECT
  p.id,
  p.full_name,
  p.furigana,
  au.email
FROM public.parents p
JOIN auth.users au ON p.user_id = au.id
ORDER BY p.full_name;

-- 4. 親子関係
SELECT
  parent.full_name as parent_name,
  student.full_name as student_name,
  student.login_id,
  student.grade
FROM public.parent_child_relations pcr
JOIN public.parents parent ON pcr.parent_id = parent.id
JOIN public.students student ON pcr.student_id = student.id
ORDER BY parent.full_name, student.grade;
