-- hana6を削除する前に、何が削除されるか確認

-- 削除される親子関係（1件のはず）
SELECT '削除される親子関係:' as check_type;
SELECT pcr.*, p.full_name as parent, s.full_name as student
FROM public.parent_child_relations pcr
JOIN public.parents p ON pcr.parent_id = p.id
JOIN public.students s ON pcr.student_id = s.id
WHERE student_id IN (SELECT id FROM public.students WHERE login_id = 'hana6');

-- 削除されるstudent（1件のはず）
SELECT '削除されるstudent:' as check_type;
SELECT * FROM public.students WHERE login_id = 'hana6';

-- 削除されるprofile（1件のはず）
SELECT '削除されるprofile:' as check_type;
SELECT * FROM public.profiles WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';

-- 削除されるauth.user（1件のはず）
SELECT '削除されるauth.user:' as check_type;
SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'hana6@studyspark.local';

-- 残るユーザー（4人いるはず）
SELECT '残るauth.users:' as check_type;
SELECT email, raw_user_meta_data->>'full_name' as name
FROM auth.users
WHERE email != 'hana6@studyspark.local'
ORDER BY email;

-- study_logsなどの他のテーブルは全く影響を受けません
SELECT 'study_logsテーブル:' as check_type, COUNT(*) as total_records FROM public.study_logs;
SELECT 'test_schedulesテーブル:' as check_type, COUNT(*) as total_records FROM public.test_schedules;
