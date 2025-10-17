-- Profilesだけを確認
SELECT COUNT(*) as total_profiles FROM public.profiles;

SELECT
  id,
  role,
  display_name,
  nickname,
  avatar_id
FROM public.profiles
ORDER BY created_at;
