-- hana6のstudentレコードのみ作成（profileは既に存在するため）

INSERT INTO public.students (user_id, full_name, furigana, login_id, grade, course, created_at, updated_at)
VALUES (
  '1f01a511-3045-4a5c-9c1c-115913c630d9',
  '青空 花',
  'あおぞら はな',
  'hana6',
  6,
  'B',
  NOW(),
  NOW()
);

-- 確認
SELECT 'Student created:' as status, * FROM public.students WHERE user_id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
