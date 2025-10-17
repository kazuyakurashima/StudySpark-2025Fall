-- 各テーブルの状況を個別に確認

-- 1. Auth Users（5人いるはず）
SELECT 'Auth Users:' as check_type, COUNT(*) as count FROM auth.users;
SELECT email, raw_user_meta_data->>'role' as role FROM auth.users ORDER BY email;

-- 2. Profiles（5人いるはず）
SELECT 'Profiles:' as check_type, COUNT(*) as count FROM public.profiles;
SELECT role, display_name, nickname FROM public.profiles ORDER BY created_at;

-- 3. Students（3人いるはず）
SELECT 'Students:' as check_type, COUNT(*) as count FROM public.students;
SELECT full_name, login_id, grade, course FROM public.students ORDER BY grade, login_id;

-- 4. Parents（2人いるはず）
SELECT 'Parents:' as check_type, COUNT(*) as count FROM public.parents;
SELECT full_name FROM public.parents ORDER BY full_name;
