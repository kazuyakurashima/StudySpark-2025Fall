-- hikaru6のUser Metadataを修正

UPDATE auth.users
SET raw_user_meta_data = '{"role":"student","login_id":"hikaru6","full_name":"星野 光","email_verified":true}'::jsonb
WHERE id = '02720550-3dce-4846-b000-7a354f8f6c40';

-- 確認
SELECT id, email, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'full_name' as full_name, raw_user_meta_data->>'login_id' as login_id
FROM auth.users
WHERE id = '02720550-3dce-4846-b000-7a354f8f6c40';
