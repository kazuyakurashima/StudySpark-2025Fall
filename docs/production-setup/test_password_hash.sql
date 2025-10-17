-- hana6のパスワードハッシュが正しいか検証

-- 1. 現在のパスワードハッシュを確認
SELECT
  email,
  encrypted_password,
  LENGTH(encrypted_password) as hash_length,
  SUBSTRING(encrypted_password, 1, 4) as hash_prefix,
  email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users
WHERE email = 'hana6@studyspark.local';

-- 2. 'demo2025' のハッシュと比較
-- cryptでハッシュ化したものと、既存のハッシュが一致するか
SELECT
  email,
  encrypted_password = crypt('demo2025', encrypted_password) as password_matches_demo2025
FROM auth.users
WHERE email = 'hana6@studyspark.local';

-- 3. もし false が返ったら、パスワードが demo2025 ではない
-- true が返ったら、パスワードは正しいが別の問題がある
