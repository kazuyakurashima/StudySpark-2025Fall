-- Studentsだけを確認
SELECT COUNT(*) as total_students FROM public.students;

SELECT
  id,
  user_id,
  full_name,
  login_id,
  grade,
  course
FROM public.students
ORDER BY grade, login_id;
