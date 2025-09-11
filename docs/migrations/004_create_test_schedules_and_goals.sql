-- Migration: 004_create_test_schedules_and_goals.sql
-- Description: Create test_schedules and goals tables
-- Depends on: 001_create_profiles_table.sql

-- Create test_schedules table
CREATE TABLE IF NOT EXISTS test_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('合不合判定テスト', '週テスト')),
  test_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_schedule_id uuid NOT NULL REFERENCES test_schedules(id) ON DELETE CASCADE,
  target_course text CHECK (target_course IN ('S', 'A', 'B', 'C')),
  target_group integer CHECK (target_group > 0),
  subject_targets jsonb, -- Store subject-specific score targets
  thoughts text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_schedules_date ON test_schedules(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_test_schedules_type ON test_schedules(test_type);
CREATE INDEX IF NOT EXISTS idx_test_schedules_active ON test_schedules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_goals_student_id ON goals(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_test_schedule_id ON goals(test_schedule_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Enable RLS on test_schedules (publicly readable for active schedules)
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active test schedules
CREATE POLICY "All users can view active test schedules" ON test_schedules
  FOR SELECT USING (is_active = true);

-- Enable RLS on goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Students can manage their own goals
CREATE POLICY "Students can manage own goals" ON goals
  FOR ALL USING (auth.uid() = student_id);

-- Parents can view their children's goals
CREATE POLICY "Parents can view children goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = goals.student_id
        AND profiles.parent_id = auth.uid()
    )
  );

-- Coaches can view goals of students in their classes
CREATE POLICY "Coaches can view class students goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles coach_profile
      JOIN classes ON classes.coach_id = coach_profile.id
      JOIN class_memberships ON class_memberships.class_id = classes.id
      WHERE coach_profile.id = auth.uid()
        AND coach_profile.role = 'coach'
        AND class_memberships.student_id = goals.student_id
    )
  );

-- Create trigger for goals updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
