-- Migration: 006_create_learning_streaks.sql
-- Description: Create learning_streaks table for tracking consecutive learning days
-- Depends on: 001_create_profiles_table.sql

-- Create learning_streaks table
CREATE TABLE IF NOT EXISTS learning_streaks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_study_date date,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_streaks_student_id ON learning_streaks(student_id);

-- Enable RLS
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Students can view their own streaks
CREATE POLICY "Students can view own learning streaks" ON learning_streaks
  FOR SELECT USING (auth.uid() = student_id);

-- Parents can view their children's streaks
CREATE POLICY "Parents can view children learning streaks" ON learning_streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = learning_streaks.student_id
        AND profiles.parent_id = auth.uid()
    )
  );

-- Coaches can view streaks of students in their classes
CREATE POLICY "Coaches can view class students learning streaks" ON learning_streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles coach_profile
      JOIN classes ON classes.coach_id = coach_profile.id
      JOIN class_memberships ON class_memberships.class_id = classes.id
      WHERE coach_profile.id = auth.uid()
        AND coach_profile.role = 'coach'
        AND class_memberships.student_id = learning_streaks.student_id
    )
  );

-- System can manage streaks (for automated updates)
CREATE POLICY "System can manage learning streaks" ON learning_streaks
  FOR ALL USING (true); -- This might need to be restricted to a service role

-- Create trigger for updated_at
CREATE TRIGGER update_learning_streaks_updated_at
  BEFORE UPDATE ON learning_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update learning streaks
CREATE OR REPLACE FUNCTION update_learning_streak(p_student_id uuid, p_study_date date)
RETURNS void AS $$
DECLARE
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_last_study_date date;
  v_date_diff integer;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak, last_study_date
  INTO v_current_streak, v_longest_streak, v_last_study_date
  FROM learning_streaks
  WHERE student_id = p_student_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO learning_streaks (student_id, current_streak, longest_streak, last_study_date)
    VALUES (p_student_id, 1, 1, p_study_date);
    RETURN;
  END IF;
  
  -- If same date, don't update
  IF v_last_study_date = p_study_date THEN
    RETURN;
  END IF;
  
  -- Calculate date difference
  v_date_diff := p_study_date - v_last_study_date;
  
  -- Update streak based on date difference
  IF v_date_diff = 1 THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  ELSIF v_date_diff > 1 THEN
    -- Streak broken
    v_current_streak := 1;
  ELSE
    -- Future date or past date, don't update streak
    RETURN;
  END IF;
  
  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Update the record
  UPDATE learning_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_study_date = p_study_date,
      updated_at = timezone('utc'::text, now())
  WHERE student_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update streaks when learning records are inserted
CREATE OR REPLACE FUNCTION trigger_update_learning_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_learning_streak(NEW.student_id, NEW.study_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on learning_records to automatically update streaks
-- Note: This will only work after learning_records table is created
-- You might need to run this separately after creating learning_records
-- CREATE TRIGGER update_streak_on_learning_record
--   AFTER INSERT OR UPDATE ON learning_records
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_update_learning_streak();
