-- hikaru6のUser Metadataを更新
-- 注意: 'HIKARU6_UUID_HERE' を実際のUUIDに置き換えてください

UPDATE auth.users
SET raw_user_meta_data = '{"role":"student","login_id":"hikaru6","full_name":"星野 光","email_verified":true}'::jsonb
WHERE email = 'hikaru6@studyspark.local';

-- 確認
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'hikaru6@studyspark.local';
