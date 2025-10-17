-- ============================================================================
-- STEP 4: 親子関係を作成
-- ============================================================================
-- 前提: STEP 3でprofiles, students, parentsが作成済み

-- 青空家: 青空太郎 → 青空花（hana6）
INSERT INTO public.parent_child_relations (parent_id, student_id, created_at)
SELECT p.id, s.id, NOW()
FROM public.parents p
CROSS JOIN public.students s
WHERE p.full_name = '青空 太郎'
  AND s.login_id = 'hana6';

-- 星野家: 星野一朗 → 星野光（hikaru6）
INSERT INTO public.parent_child_relations (parent_id, student_id, created_at)
SELECT p.id, s.id, NOW()
FROM public.parents p
CROSS JOIN public.students s
WHERE p.full_name = '星野 一朗'
  AND s.login_id = 'hikaru6';

-- 星野家: 星野一朗 → 星野明（akira5）
INSERT INTO public.parent_child_relations (parent_id, student_id, created_at)
SELECT p.id, s.id, NOW()
FROM public.parents p
CROSS JOIN public.students s
WHERE p.full_name = '星野 一朗'
  AND s.login_id = 'akira5';

-- ============================================================================
-- 確認クエリ
-- ============================================================================

SELECT
  '親子関係:' as label,
  p.full_name as parent_name,
  s.full_name as student_name,
  s.login_id,
  s.grade
FROM public.parent_child_relations pcr
JOIN public.parents p ON pcr.parent_id = p.id
JOIN public.students s ON pcr.student_id = s.id
ORDER BY p.full_name, s.grade;

-- 期待される結果:
-- 青空 太郎 → 青空 花 (hana6, grade 6)
-- 星野 一朗 → 星野 光 (hikaru6, grade 6)
-- 星野 一朗 → 星野 明 (akira5, grade 5)
