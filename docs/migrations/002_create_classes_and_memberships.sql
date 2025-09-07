-- Migration: 002_create_classes_and_memberships.sql
-- Description: Create classes and class_memberships tables
-- Depends on: 001_create_profiles_table.sql

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create class_memberships table
CREATE TABLE IF NOT EXISTS class_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure a student can only be in one class at a time
  UNIQUE(student_id, class_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_coach_id ON classes(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_student_id ON class_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON class_memberships(class_id);

-- Enable RLS on classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- RLS policies for classes
CREATE POLICY "Coaches can manage own classes" ON classes
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Students can view their classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships
      WHERE class_memberships.class_id = classes.id
        AND class_memberships.student_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children's classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles child_profile
      JOIN class_memberships ON class_memberships.student_id = child_profile.id
      WHERE child_profile.parent_id = auth.uid()
        AND class_memberships.class_id = classes.id
    )
  );

-- Enable RLS on class_memberships
ALTER TABLE class_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_memberships
CREATE POLICY "Coaches can manage class memberships" ON class_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_memberships.class_id
        AND classes.coach_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own memberships" ON class_memberships
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents can view children memberships" ON class_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = student_id
        AND profiles.parent_id = auth.uid()
    )
  );

-- Create trigger for classes updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();