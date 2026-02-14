-- ============================================================================
-- 指導者6名追加 + 管理者アカウント修正スクリプト
-- 実行場所: Supabase SQL Editor (本番環境)
-- 実行日: 2026-02-14
--
-- 注意: auth.users への直接 INSERT は Supabase Auth のレート制限を回避するため
-- ============================================================================

-- ============================================================================
-- Part 0: 事前確認（DRY RUN）
-- まずこのブロックだけ実行して既存状態を確認してください
-- ============================================================================

-- 既存の指導者を確認
SELECT u.email, p.role, c.full_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.coaches c ON c.user_id = u.id
WHERE p.role = 'coach';

-- admin アカウントの状態を確認
SELECT
  u.id,
  u.email,
  p.role,
  p.setup_completed,
  a.full_name AS admin_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.admins a ON a.user_id = u.id
WHERE u.email = 'admin@studyspark.jp';

-- 追加予定のメールが既存でないか確認
SELECT email FROM auth.users
WHERE email IN (
  'miyake@studyspark.jp',
  'abe@studyspark.jp',
  'ota@studyspark.jp',
  'ikeda@studyspark.jp',
  'yashiro@studyspark.jp',
  'kimura@studyspark.jp'
);

-- ============================================================================
-- Part 1: 指導者6名の追加
-- Part 0 で問題なければ以下を実行
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  -- ----------------------------------------------------------------
  -- 1. 三宅悠斗 (miyake@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'miyake@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'miyake@studyspark.jp',
      crypt('miyake2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"三宅悠斗"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'miyake@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'miyake@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '三宅悠斗', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '三宅悠斗', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '三宅悠斗', gen_random_uuid());

    RAISE NOTICE '✅ miyake@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ miyake@studyspark.jp already exists, skipped';
  END IF;

  -- ----------------------------------------------------------------
  -- 2. 阿部優希 (abe@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'abe@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'abe@studyspark.jp',
      crypt('abe2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"阿部優希"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'abe@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'abe@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '阿部優希', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '阿部優希', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '阿部優希', gen_random_uuid());

    RAISE NOTICE '✅ abe@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ abe@studyspark.jp already exists, skipped';
  END IF;

  -- ----------------------------------------------------------------
  -- 3. 太田梨那 (ota@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ota@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'ota@studyspark.jp',
      crypt('ota2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"太田梨那"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'ota@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'ota@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '太田梨那', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '太田梨那', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '太田梨那', gen_random_uuid());

    RAISE NOTICE '✅ ota@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ ota@studyspark.jp already exists, skipped';
  END IF;

  -- ----------------------------------------------------------------
  -- 4. 池田大晟 (ikeda@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ikeda@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'ikeda@studyspark.jp',
      crypt('ikeda2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"池田大晟"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'ikeda@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'ikeda@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '池田大晟', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '池田大晟', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '池田大晟', gen_random_uuid());

    RAISE NOTICE '✅ ikeda@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ ikeda@studyspark.jp already exists, skipped';
  END IF;

  -- ----------------------------------------------------------------
  -- 5. 矢代貴司 (yashiro@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'yashiro@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'yashiro@studyspark.jp',
      crypt('yashiro2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"矢代貴司"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'yashiro@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'yashiro@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '矢代貴司', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '矢代貴司', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '矢代貴司', gen_random_uuid());

    RAISE NOTICE '✅ yashiro@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ yashiro@studyspark.jp already exists, skipped';
  END IF;

  -- ----------------------------------------------------------------
  -- 6. 木村幸絵 (kimura@studyspark.jp)
  -- ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kimura@studyspark.jp') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_user_id, v_instance_id, 'kimura@studyspark.jp',
      crypt('kimura2026', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","name":"木村幸絵"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'kimura@studyspark.jp', 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', 'kimura@studyspark.jp'),
      v_now, v_now, v_now
    );

    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_user_id, 'coach', '木村幸絵', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'coach', display_name = '木村幸絵', avatar_id = 'parent1', setup_completed = true;

    INSERT INTO public.coaches (user_id, full_name, invitation_code)
    VALUES (v_user_id, '木村幸絵', gen_random_uuid());

    RAISE NOTICE '✅ kimura@studyspark.jp created (id: %)', v_user_id;
  ELSE
    RAISE NOTICE '⏭️ kimura@studyspark.jp already exists, skipped';
  END IF;

END $$;

-- ============================================================================
-- Part 2: 管理者アカウント修正 (admin@studyspark.jp)
-- ============================================================================

DO $$
DECLARE
  v_admin_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  -- admin ユーザーの存在確認
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@studyspark.jp';

  IF v_admin_user_id IS NULL THEN
    -- admin が auth.users に存在しない → 新規作成
    v_admin_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      v_admin_user_id, v_instance_id, 'admin@studyspark.jp',
      crypt('admin2025', gen_salt('bf')),
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","name":"管理者"}'::jsonb,
      'authenticated', 'authenticated', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_admin_user_id, 'admin@studyspark.jp', 'email',
      jsonb_build_object('sub', v_admin_user_id::text, 'email', 'admin@studyspark.jp'),
      v_now, v_now, v_now
    );

    RAISE NOTICE '✅ admin auth.users created (id: %)', v_admin_user_id;
  ELSE
    RAISE NOTICE 'ℹ️ admin auth.users already exists (id: %)', v_admin_user_id;
  END IF;

  -- profiles の確認・修正
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_user_id) THEN
    INSERT INTO public.profiles (id, role, display_name, avatar_id, setup_completed)
    VALUES (v_admin_user_id, 'admin', '管理者', 'parent1', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = '管理者', avatar_id = 'parent1', setup_completed = true;
    RAISE NOTICE '✅ admin profile created';
  ELSE
    -- role が admin でない場合は修正
    UPDATE public.profiles
    SET role = 'admin', setup_completed = true
    WHERE id = v_admin_user_id AND role != 'admin';

    IF FOUND THEN
      RAISE NOTICE '⚠️ admin profile role corrected to admin';
    ELSE
      RAISE NOTICE 'ℹ️ admin profile already correct';
    END IF;
  END IF;

  -- admins テーブルの確認・修正
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin_user_id) THEN
    INSERT INTO public.admins (user_id, full_name, invitation_code)
    VALUES (v_admin_user_id, '管理者', gen_random_uuid());
    RAISE NOTICE '✅ admins record created';
  ELSE
    RAISE NOTICE 'ℹ️ admins record already exists';
  END IF;

END $$;

-- ============================================================================
-- Part 3: 最終確認
-- ============================================================================

-- 全指導者の確認
SELECT u.email, p.role, c.full_name, c.id AS coach_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.coaches c ON c.user_id = u.id
WHERE p.role = 'coach'
ORDER BY u.email;

-- admin の確認
SELECT u.email, p.role, a.full_name, a.id AS admin_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.admins a ON a.user_id = u.id
WHERE u.email = 'admin@studyspark.jp';
