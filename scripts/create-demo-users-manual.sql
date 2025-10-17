-- デモユーザー作成（手動版）
-- 青空家、星野家（2家族）のデモデータを作成

BEGIN;

-- 1. 青空 花（小6生徒）
-- メールアドレスは <login_id>@studyspark.local 形式
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  'a0000001-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'hana6@studyspark.local',
  crypt('demo2025', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"login_id":"hana6","full_name":"青空 花","role":"student"}',
  'authenticated', 'authenticated'
);

UPDATE profiles SET
  nickname = 'はなちゃん🌸',
  avatar_id = 'student2',
  display_name = '青空 花',
  setup_completed = true
WHERE id = 'a0000001-0001-0001-0001-000000000001';

UPDATE students SET
  full_name = '青空 花',
  furigana = 'あおぞらはな',
  grade = 6
WHERE user_id = 'a0000001-0001-0001-0001-000000000001';

-- 2. 青空 太郎（保護者）
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  'a0000001-0001-0001-0002-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'toshin.hitachi+test001@gmail.com',
  crypt('Testdemo2025', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"青空 太郎","role":"parent"}',
  'authenticated', 'authenticated'
);

UPDATE profiles SET
  nickname = '太郎さん',
  avatar_id = 'parent1',
  display_name = '青空 太郎',
  setup_completed = true
WHERE id = 'a0000001-0001-0001-0002-000000000002';

UPDATE parents SET
  full_name = '青空 太郎',
  furigana = 'あおぞらたろう'
WHERE user_id = 'a0000001-0001-0001-0002-000000000002';

-- 親子関係は後で手動で設定（students.id, parents.idが必要）

-- 3. 星野 光（小6生徒）
-- メールアドレスは <login_id>@studyspark.local 形式
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  'b0000002-0002-0002-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'hikaru6@studyspark.local',
  crypt('demo2025', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"login_id":"hikaru6","full_name":"星野 光","role":"student"}',
  'authenticated', 'authenticated'
);

UPDATE profiles SET
  nickname = 'ひかるくん🚀',
  avatar_id = 'student3',
  display_name = '星野 光',
  setup_completed = true
WHERE id = 'b0000002-0002-0002-0001-000000000001';

UPDATE students SET
  full_name = '星野 光',
  furigana = 'ほしのひかる',
  grade = 6
WHERE user_id = 'b0000002-0002-0002-0001-000000000001';

-- 4. 星野 明（小5生徒・兄弟）
-- メールアドレスは <login_id>@studyspark.local 形式
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  'b0000002-0002-0002-0002-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'akira5@studyspark.local',
  crypt('demo2025', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"login_id":"akira5","full_name":"星野 明","role":"student"}',
  'authenticated', 'authenticated'
);

UPDATE profiles SET
  nickname = 'あきらくん✨',
  avatar_id = 'student5',
  display_name = '星野 明',
  setup_completed = true
WHERE id = 'b0000002-0002-0002-0002-000000000002';

UPDATE students SET
  full_name = '星野 明',
  furigana = 'ほしのあきら',
  grade = 5
WHERE user_id = 'b0000002-0002-0002-0002-000000000002';

-- 5. 星野 一朗（保護者・兄弟共通）
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  'b0000002-0002-0002-0003-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'toshin.hitachi+test002@gmail.com',
  crypt('Testdemo2025', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"星野 一朗","role":"parent"}',
  'authenticated', 'authenticated'
);

UPDATE profiles SET
  nickname = '一朗さん',
  avatar_id = 'parent2',
  display_name = '星野 一朗',
  setup_completed = true
WHERE id = 'b0000002-0002-0002-0003-000000000003';

UPDATE parents SET
  full_name = '星野 一朗',
  furigana = 'ほしのいちろう'
WHERE user_id = 'b0000002-0002-0002-0003-000000000003';

-- 親子関係は後で手動で設定（students.id, parents.idが必要）

COMMIT;

-- 作成結果を表示
SELECT '=== デモユーザー作成完了 ===' as status;
SELECT
  '生徒: ' || s.full_name || ' (ログインID: ' ||
  (SELECT raw_user_meta_data->>'login_id' FROM auth.users WHERE id = p.id) ||
  ' / パスワード: demo2025)' as credentials
FROM profiles p
JOIN students s ON s.user_id = p.id
WHERE p.id IN (
  'a0000001-0001-0001-0001-000000000001',
  'b0000002-0002-0002-0001-000000000001',
  'b0000002-0002-0002-0002-000000000002'
);

SELECT
  '保護者: ' || par.full_name || ' (メール: ' || u.email || ' / パスワード: Testdemo2025)' as credentials
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN parents par ON par.user_id = p.id
WHERE p.id IN (
  'a0000001-0001-0001-0002-000000000002',
  'b0000002-0002-0002-0003-000000000003'
);
