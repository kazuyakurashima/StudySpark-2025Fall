-- Migration: 007_insert_test_data.sql
-- Description: Insert initial test schedule data
-- Depends on: 004_create_test_schedules_and_goals.sql

-- Insert test schedules based on the current application's mock data
INSERT INTO test_schedules (name, test_type, test_date, is_active) VALUES
  -- 合不合判定テスト
  ('第3回合不合判定テスト', '合不合判定テスト', '2024-09-08', true),
  ('第4回合不合判定テスト', '合不合判定テスト', '2024-10-05', true),
  ('第5回合不合判定テスト', '合不合判定テスト', '2024-11-16', true),
  ('第6回合不合判定テスト', '合不合判定テスト', '2024-12-07', true),
  
  -- 週テスト
  ('第2回週テスト', '週テスト', '2024-09-13', true),
  ('第3回週テスト', '週テスト', '2024-09-20', true),
  ('第4回週テスト', '週テスト', '2024-09-27', true),
  ('第5回週テスト', '週テスト', '2024-10-11', true),
  ('第6回週テスト', '週テスト', '2024-10-18', true),
  ('第7回週テスト', '週テスト', '2024-10-25', true),
  ('第8回週テスト', '週テスト', '2024-11-08', true),
  ('第9回週テスト', '週テスト', '2024-11-22', true),
  ('第10回週テスト', '週テスト', '2024-11-29', true)

ON CONFLICT DO NOTHING;

-- Insert sample coach codes for validation
-- Note: In production, these should be properly hashed
-- This is just for development/testing purposes

-- Create a function to validate coach codes
CREATE OR REPLACE FUNCTION validate_coach_code(code text)
RETURNS boolean AS $$
BEGIN
  RETURN code IN ('COACH123', 'TEACHER456', 'MENTOR789');
END;
$$ LANGUAGE plpgsql;

-- Example of inserting some demo profiles (commented out - you can uncomment for testing)
-- Note: These would normally be created through the application signup process

/*
-- Insert demo coach
INSERT INTO profiles (id, email, name, role, coach_code, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'coach@example.com', 
  '田中先生', 
  'coach', 
  'COACH123',
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Insert demo parent
INSERT INTO profiles (id, email, name, role, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'parent@example.com', 
  'お母さん', 
  'parent',
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Insert demo student (you would need to set parent_id to the parent's UUID)
INSERT INTO profiles (id, email, name, role, parent_id, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'student@example.com', 
  '太郎', 
  'student',
  (SELECT id FROM profiles WHERE email = 'parent@example.com' LIMIT 1),
  now(),
  now()
) ON CONFLICT DO NOTHING;
*/