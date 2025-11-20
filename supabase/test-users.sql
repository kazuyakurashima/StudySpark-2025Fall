-- ============================================================================
-- テストユーザーデータ投入
-- ============================================================================
-- 作成日: 2025-11-11
-- 説明: 開発・テスト用のユーザーデータを投入

-- ----------------------------------------------------------------------------
-- 1. auth.users テーブルにユーザーを作成
-- ----------------------------------------------------------------------------
-- 注意: パスワードは bcrypt でハッシュ化されている必要があります
-- demo2025 のハッシュ: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- Testdemo2025 のハッシュ: $2a$10$5K3c8XN9mGQZ4P8eJ7xGPOqYZH8fZ5tL9vZjN2mQaL8nE6dR3lH9m

-- 生徒ユーザー（ログインID/パスワード認証）
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
) VALUES
-- akira5（星野 明・小5・Bコース）
(
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'akira5@studyspark.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- demo2025
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"login_type":"student_id"}',
  '{"login_id":"akira5"}',
  false,
  '',
  ''
),
-- hikaru6（星野 光・小6・Aコース）
(
  'b0000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'hikaru6@studyspark.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- demo2025
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"login_type":"student_id"}',
  '{"login_id":"hikaru6"}',
  false,
  '',
  ''
),
-- hana6（青空花・小6・Bコース）
(
  'c0000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'hana6@studyspark.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- demo2025
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"login_type":"student_id"}',
  '{"login_id":"hana6"}',
  false,
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- 保護者ユーザー（メール/パスワード認証）
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
) VALUES
-- 星野 一朗（星野明・星野光の保護者）
(
  'd0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo-parent2@example.com',
  '$2a$10$5K3c8XN9mGQZ4P8eJ7xGPOqYZH8fZ5tL9vZjN2mQaL8nE6dR3lH9m', -- Testdemo2025
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
),
-- 青空太郎（青空花の保護者）
(
  'e0000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo-parent1@example.com',
  '$2a$10$5K3c8XN9mGQZ4P8eJ7xGPOqYZH8fZ5tL9vZjN2mQaL8nE6dR3lH9m', -- Testdemo2025
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. profiles テーブルにプロフィールを作成
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, setup_completed) VALUES
-- 生徒プロフィール
('a0000000-0000-0000-0000-000000000001'::uuid, 'student', '星野 明', 'あきら', 1, '#3B82F6', true),
('b0000000-0000-0000-0000-000000000002'::uuid, 'student', '星野 光', 'ひかる', 2, '#10B981', true),
('c0000000-0000-0000-0000-000000000003'::uuid, 'student', '青空 花', 'はな', 3, '#EF4444', true),
-- 保護者プロフィール
('d0000000-0000-0000-0000-000000000001'::uuid, 'parent', '星野 一朗', '一朗', 10, '#6B7280', true),
('e0000000-0000-0000-0000-000000000002'::uuid, 'parent', '青空 太郎', '太郎', 11, '#6B7280', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. students テーブルに生徒情報を作成
-- ----------------------------------------------------------------------------
INSERT INTO public.students (user_id, login_id, full_name, grade, course) VALUES
('a0000000-0000-0000-0000-000000000001'::uuid, 'akira5', '星野 明', 5, 'B'),
('b0000000-0000-0000-0000-000000000002'::uuid, 'hikaru6', '星野 光', 6, 'A'),
('c0000000-0000-0000-0000-000000000003'::uuid, 'hana6', '青空 花', 6, 'B')
ON CONFLICT (login_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. parents テーブルに保護者情報を作成
-- ----------------------------------------------------------------------------
INSERT INTO public.parents (user_id, full_name) VALUES
('d0000000-0000-0000-0000-000000000001'::uuid, '星野 一朗'),
('e0000000-0000-0000-0000-000000000002'::uuid, '青空 太郎')
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. parent_child_relations テーブルに保護者-生徒の関係を作成
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_parent_hoshino_id BIGINT;
  v_parent_aozora_id BIGINT;
  v_student_akira_id BIGINT;
  v_student_hikaru_id BIGINT;
  v_student_hana_id BIGINT;
BEGIN
  -- 保護者IDを取得
  SELECT id INTO v_parent_hoshino_id FROM public.parents WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid;
  SELECT id INTO v_parent_aozora_id FROM public.parents WHERE user_id = 'e0000000-0000-0000-0000-000000000002'::uuid;

  -- 生徒IDを取得
  SELECT id INTO v_student_akira_id FROM public.students WHERE login_id = 'akira5';
  SELECT id INTO v_student_hikaru_id FROM public.students WHERE login_id = 'hikaru6';
  SELECT id INTO v_student_hana_id FROM public.students WHERE login_id = 'hana6';

  -- 星野一朗 → 星野明、星野光
  INSERT INTO public.parent_child_relations (parent_id, student_id)
  VALUES
    (v_parent_hoshino_id, v_student_akira_id),
    (v_parent_hoshino_id, v_student_hikaru_id)
  ON CONFLICT DO NOTHING;

  -- 青空太郎 → 青空花
  INSERT INTO public.parent_child_relations (parent_id, student_id)
  VALUES
    (v_parent_aozora_id, v_student_hana_id)
  ON CONFLICT DO NOTHING;
END $$;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'テストユーザーデータ投入完了';
  RAISE NOTICE '- 生徒: akira5 (星野明・小5・B), hikaru6 (星野光・小6・A), hana6 (青空花・小6・B)';
  RAISE NOTICE '- 保護者: 星野一朗, 青空太郎';
  RAISE NOTICE '- 保護者-生徒関係: 星野一朗→明・光, 青空太郎→花';
END $$;
