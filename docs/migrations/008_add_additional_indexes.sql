-- Migration: 008_add_additional_indexes.sql
-- Description: Add additional indexes for performance optimization
-- Depends on: All previous migrations

-- Additional composite indexes for common query patterns

-- For learning records queries (student + date range)
CREATE INDEX IF NOT EXISTS idx_learning_records_student_date_subject 
  ON learning_records(student_id, study_date DESC, subject);

-- For finding recent learning records
CREATE INDEX IF NOT EXISTS idx_learning_records_created_at 
  ON learning_records(created_at DESC);

-- For goal queries by status and test date
CREATE INDEX IF NOT EXISTS idx_goals_student_status 
  ON goals(student_id, status) WHERE status = 'active';

-- For test schedules by date range
CREATE INDEX IF NOT EXISTS idx_test_schedules_date_active 
  ON test_schedules(test_date ASC, is_active) WHERE is_active = true;

-- For message queries with read status
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
  ON messages(recipient_id, created_at DESC) WHERE is_read = false;

-- For finding recent AI coach messages
CREATE INDEX IF NOT EXISTS idx_ai_coach_messages_student_recent 
  ON ai_coach_messages(student_id, created_at DESC);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_profiles_active_students 
  ON profiles(id, name) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_profiles_active_parents 
  ON profiles(id, name) WHERE role = 'parent';

CREATE INDEX IF NOT EXISTS idx_profiles_active_coaches 
  ON profiles(id, name) WHERE role = 'coach';

-- Index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_profiles_parent_children 
  ON profiles(parent_id) WHERE parent_id IS NOT NULL;

-- Add JSONB indexes for subject_targets in goals table
CREATE INDEX IF NOT EXISTS idx_goals_subject_targets 
  ON goals USING GIN (subject_targets) WHERE subject_targets IS NOT NULL;

-- Add trigger data index for ai_coach_messages
CREATE INDEX IF NOT EXISTS idx_ai_coach_trigger_data 
  ON ai_coach_messages USING GIN (trigger_data) WHERE trigger_data IS NOT NULL;

-- Add index for class membership lookups
CREATE INDEX IF NOT EXISTS idx_class_memberships_lookup 
  ON class_memberships(class_id, student_id);

-- Add index for streak calculations
CREATE INDEX IF NOT EXISTS idx_learning_records_streak_calc 
  ON learning_records(student_id, study_date ASC);

-- Statistics and maintenance
-- Update table statistics after creating indexes
ANALYZE profiles;
ANALYZE classes;
ANALYZE class_memberships;
ANALYZE learning_records;
ANALYZE test_schedules;
ANALYZE goals;
ANALYZE messages;
ANALYZE ai_coach_messages;
ANALYZE learning_streaks;