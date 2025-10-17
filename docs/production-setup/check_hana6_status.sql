-- hana6の現在の状態を確認

-- auth.users
SELECT 'auth.users:' as table_name, id, email, raw_user_meta_data
FROM auth.users
WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';

-- profiles
SELECT 'profiles:' as table_name, id, role, display_name, nickname, avatar_id
FROM public.profiles
WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';

-- students
SELECT 'students:' as table_name, id, user_id, full_name, login_id, grade, course
FROM public.students
WHERE user_id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
