-- Migration: 003_create_learning_records.sql
-- Description: Create learning_records table with RLS policies
-- Depends on: 001_create_profiles_table.sql

-- Create learning_records table
CREATE TABLE IF NOT EXISTS learning_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (subject IN ('算数', '国語', '理科', '社会')),
  lesson_type text NOT NULL CHECK (lesson_type IN ('授業', '宿題')),
  understanding_level integer NOT NULL CHECK (understanding_level >= 1 AND understanding_level <= 5),
  notes text,
  study_date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_records_student_date ON learning_records(student_id, study_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_records_subject ON learning_records(subject);
CREATE INDEX IF NOT EXISTS idx_learning_records_student_id ON learning_records(student_id);

-- Enable RLS
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Students can manage their own records
CREATE POLICY "Students can manage own learning records" ON learning_records
  FOR ALL USING (auth.uid() = student_id);

-- Parents can view their children's records
CREATE POLICY "Parents can view children learning records" ON learning_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = learning_records.student_id
        AND profiles.parent_id = auth.uid()
    )
  );

-- Coaches can view records of students in their classes
CREATE POLICY "Coaches can view class students learning records" ON learning_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles coach_profile
      JOIN classes ON classes.coach_id = coach_profile.id
      JOIN class_memberships ON class_memberships.class_id = classes.id
      WHERE coach_profile.id = auth.uid()
        AND coach_profile.role = 'coach'
        AND class_memberships.student_id = learning_records.student_id
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_learning_records_updated_at
  BEFORE UPDATE ON learning_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
