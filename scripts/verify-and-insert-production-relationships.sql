-- =========================================
-- 本番環境：親子紐付け設定用SQL
-- =========================================
-- 実行前の確認事項:
-- 1. Supabase Dashboard → API → "Reload schema cache" を実行済みか
-- 2. RLSポリシーを確認（Service Roleで実行するため通常は問題なし）
-- 3. 以下のUUIDが正しいことを確認
-- =========================================

-- ステップ1: 現在の親・生徒のIDを確認
-- =========================================
SELECT
  'PARENTS' as category,
  p.id,
  p.display_name,
  au.email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role = 'parent'
ORDER BY p.display_name;

SELECT
  'STUDENTS' as category,
  p.id as profile_id,
  s.id as student_id,
  p.display_name,
  au.email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
JOIN public.students s ON s.user_id = p.id
WHERE p.role = 'student'
ORDER BY p.display_name;

-- ステップ2: 既存の紐付けを確認
-- =========================================
SELECT
  'EXISTING RELATIONSHIPS' as info,
  COUNT(*) as count
FROM public.parent_student_relationships;

SELECT
  pr.id as relationship_id,
  pp.display_name as parent_name,
  sp.display_name as student_name,
  pr.relationship_type,
  pr.created_at
FROM public.parent_student_relationships pr
JOIN public.profiles pp ON pr.parent_id = pp.id
JOIN public.students s ON pr.student_id = s.id
JOIN public.profiles sp ON s.user_id = sp.id;

-- ステップ3: relationship_type の制約を確認
-- =========================================
SELECT
  'CHECK CONSTRAINT' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.parent_student_relationships'::regclass
  AND contype = 'c';

-- ステップ4: 既存の紐付けを削除（もしあれば）
-- =========================================
-- DELETE FROM public.parent_student_relationships;
-- ※必要な場合のみ実行

-- ステップ5: 新しい紐付けをINSERT
-- =========================================
-- 星野一朗（parent_id確認後に実行）
-- 期待されるparent_id: 1e88050b-400b-4b5a-af84-41eb614a32a3
-- 期待されるstudent_ids: 星野光(student_id=2), 星野明(student_id=3)

INSERT INTO public.parent_student_relationships (parent_id, student_id, relationship_type)
SELECT
  p_parent.id as parent_id,
  s.id as student_id,
  'parent' as relationship_type
FROM public.profiles p_parent
CROSS JOIN LATERAL (
  SELECT s.id, sp.display_name
  FROM public.students s
  JOIN public.profiles sp ON s.user_id = sp.id
  WHERE sp.display_name IN ('星野 光', '星野 明')
) s
JOIN auth.users au_parent ON p_parent.id = au_parent.id
WHERE au_parent.email = 'toshin.hitachi+test001@gmail.com'
  AND p_parent.role = 'parent';

-- 青空太郎（parent_id確認後に実行）
-- 期待されるparent_id: 98201333-88fd-4803-b008-8894d2362ba2
-- 期待されるstudent_id: 青空花(student_id=1)

INSERT INTO public.parent_student_relationships (parent_id, student_id, relationship_type)
SELECT
  p_parent.id as parent_id,
  s.id as student_id,
  'parent' as relationship_type
FROM public.profiles p_parent
CROSS JOIN LATERAL (
  SELECT s.id, sp.display_name
  FROM public.students s
  JOIN public.profiles sp ON s.user_id = sp.id
  WHERE sp.display_name = '青空 花'
) s
JOIN auth.users au_parent ON p_parent.id = au_parent.id
WHERE au_parent.email = 'toshin.hitachi+test002@gmail.com'
  AND p_parent.role = 'parent';

-- ステップ6: 結果を確認
-- =========================================
SELECT
  'VERIFICATION' as info,
  pp.display_name as parent_name,
  au_parent.email as parent_email,
  sp.display_name as student_name,
  au_student.email as student_email,
  pr.relationship_type,
  pr.created_at
FROM public.parent_student_relationships pr
JOIN public.profiles pp ON pr.parent_id = pp.id
JOIN auth.users au_parent ON pp.id = au_parent.id
JOIN public.students s ON pr.student_id = s.id
JOIN public.profiles sp ON s.user_id = sp.id
JOIN auth.users au_student ON sp.id = au_student.id
ORDER BY pp.display_name, sp.display_name;

-- 期待される結果:
-- 星野一朗 → 星野 光
-- 星野一朗 → 星野 明
-- 青空太郎 → 青空 花
