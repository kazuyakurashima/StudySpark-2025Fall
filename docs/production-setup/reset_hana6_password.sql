-- hana6のパスワードを再設定
-- bcryptで正しくハッシュ化し直す

UPDATE auth.users
SET encrypted_password = crypt('demo2025', gen_salt('bf'))
WHERE email = 'hana6@studyspark.local';

-- 確認
SELECT
  email,
  LENGTH(encrypted_password) as hash_length,
  encrypted_password LIKE '$2%' as is_valid_hash,
  email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users
WHERE email = 'hana6@studyspark.local';
