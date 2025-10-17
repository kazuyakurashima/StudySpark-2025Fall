-- 現在の作成状況を確認

SELECT '=== Auth Users ===' as section;
SELECT email, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'full_name' as name
FROM auth.users
ORDER BY email;

SELECT '=== Profiles ===' as section;
SELECT id, role, display_name, nickname
FROM public.profiles
ORDER BY created_at;

SELECT '=== Students ===' as section;
SELECT user_id, full_name, login_id, grade, course
FROM public.students
ORDER BY grade, login_id;

SELECT '=== Parents ===' as section;
SELECT user_id, full_name
FROM public.parents
ORDER BY full_name;
