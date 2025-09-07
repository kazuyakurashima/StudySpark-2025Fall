-- Migration: 012_test_user_registration.sql
-- Description: Test queries for user registration triggers and functions
-- Depends on: 011_create_user_triggers.sql
-- NOTE: This is for testing purposes - execute these queries to verify the triggers work

-- Test 1: Check if triggers are properly created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' OR trigger_schema = 'public'
ORDER BY trigger_name;

-- Test 2: Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%user%' OR routine_name LIKE '%coach%'
ORDER BY routine_name;

-- Test 3: Verify coach code validation function
SELECT validate_coach_code('COACH123') as valid_code_test;
SELECT validate_coach_code('INVALID') as invalid_code_test;

-- Test 4: Manual profile creation test (simulating what the trigger should do)
-- CAUTION: Only run this if you want to create test data
/*
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'test-student@example.com';
BEGIN
  -- Simulate what happens when a user registers
  INSERT INTO profiles (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    test_email,
    'テスト太郎',
    'student',
    NOW(),
    NOW()
  );
  
  -- Check if learning streak was created
  INSERT INTO learning_streaks (
    student_id,
    current_streak,
    longest_streak,
    updated_at
  ) VALUES (
    test_user_id,
    0,
    0,
    NOW()
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
END $$;
*/

-- Test 5: Check parent-child relationship function
/*
-- Create test parent and child
DO $$
DECLARE
  parent_id uuid := gen_random_uuid();
  child_id uuid := gen_random_uuid();
BEGIN
  -- Create parent
  INSERT INTO profiles (id, email, name, role, created_at, updated_at)
  VALUES (parent_id, 'test-parent@example.com', 'テスト母', 'parent', NOW(), NOW());
  
  -- Create child
  INSERT INTO profiles (id, email, name, role, created_at, updated_at)
  VALUES (child_id, 'test-child@example.com', 'テスト子', 'student', NOW(), NOW());
  
  -- Test the relationship function
  PERFORM create_parent_child_relationship('test-parent@example.com', 'test-child@example.com');
  
  RAISE NOTICE 'Parent-child relationship test completed';
END $$;
*/

-- Test 6: Verify the relationship was created
/*
SELECT 
  child.name as child_name,
  child.email as child_email,
  parent.name as parent_name,
  parent.email as parent_email
FROM profiles child
LEFT JOIN profiles parent ON child.parent_id = parent.id
WHERE child.email LIKE 'test-%' OR parent.email LIKE 'test-%';
*/

-- Test 7: Clean up test data
/*
DELETE FROM learning_streaks WHERE student_id IN (
  SELECT id FROM profiles WHERE email LIKE 'test-%'
);
DELETE FROM profiles WHERE email LIKE 'test-%';
*/

-- Test 8: Check RLS policies are working
-- This should only return data accessible to the current user
SELECT 
  COUNT(*) as accessible_profiles_count
FROM profiles;

-- Test 9: Verify triggers are active
SELECT 
  trigger_name,
  trigger_schema,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN (
  'on_auth_user_created',
  'on_auth_user_updated', 
  'on_auth_user_deleted',
  'update_streak_on_learning_record'
);