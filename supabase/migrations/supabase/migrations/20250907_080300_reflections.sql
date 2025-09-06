-- Migration: Weekly Reflections with AI Feedback
-- Created: 2025-01-07
-- Purpose: Weekly reflection system with AI-powered feedback
-- Depends: 20250107_000_auth_tables.sql, 20250107_001_study_inputs.sql
-- Rollback: DROP TABLE reflections CASCADE;

BEGIN;

-- ============================================================================
-- WEEKLY REFLECTION SYSTEM
-- ============================================================================

-- reflections table for weekly reflection (REQ-005, AC-005)
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL, -- その週の月曜日
  week_end_date DATE NOT NULL,   -- その週の日曜日
  good_points TEXT NOT NULL,
  improvement_points TEXT,
  next_week_focus TEXT,
  emotion_score INTEGER CHECK (emotion_score BETWEEN 1 AND 5), -- 1:辛い 〜 5:楽しい
  ai_feedback TEXT, -- AIからのフィードバック
  ai_suggestions JSONB, -- 次週への具体的提案
  ai_model_version VARCHAR(50) DEFAULT 'gpt-5-mini', -- AI model tracking
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  UNIQUE(student_id, week_start_date),
  CONSTRAINT reflections_week_validity_check 
    CHECK (week_end_date = week_start_date + INTERVAL '6 days'),
  CONSTRAINT reflections_week_monday_check 
    CHECK (EXTRACT(DOW FROM week_start_date) = 1), -- 月曜日開始
  CONSTRAINT reflections_good_points_length_check
    CHECK (LENGTH(good_points) >= 10), -- 最小限の内容要求
  CONSTRAINT reflections_weekend_entry_check
    CHECK (EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Tokyo') IN (0, 6)) -- 土日入力
);

-- インデックス
CREATE INDEX idx_reflections_student_week ON reflections(student_id, week_start_date DESC);
CREATE INDEX idx_reflections_emotion ON reflections(emotion_score) WHERE emotion_score IS NOT NULL;
CREATE INDEX idx_reflections_created ON reflections(created_at);
CREATE INDEX idx_reflections_ai_feedback ON reflections(student_id) WHERE ai_feedback IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY FOR REFLECTIONS
-- ============================================================================

-- Enable RLS
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Students: can access their own reflections
CREATE POLICY students_own_reflections ON reflections
  FOR ALL USING (
    student_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND role = 'student' 
      AND status = 'active'
    )
  );

-- Parents: can view their children's reflections (readonly)
CREATE POLICY parents_children_reflections ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN memberships m ON m.user_id = psr.parent_id
      WHERE psr.parent_id = auth.uid()
      AND psr.student_id = reflections.student_id
      AND m.role = 'parent'
      AND m.status = 'active'
    )
  );

-- Coaches: can access students' reflections in their organization
CREATE POLICY coaches_org_students_reflections ON reflections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships coach_m
      JOIN memberships student_m ON coach_m.scope_id = student_m.scope_id
      WHERE coach_m.user_id = auth.uid()
      AND coach_m.role = 'coach'
      AND coach_m.scope_type = 'org'
      AND coach_m.status = 'active'
      AND student_m.user_id = reflections.student_id
      AND student_m.role = 'student'
      AND student_m.status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS & AUDIT LOGGING
-- ============================================================================

-- Trigger for updated_at
CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON reflections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging for reflections
CREATE OR REPLACE FUNCTION audit_reflections_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES ('reflections', OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('reflections', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES ('reflections', NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_reflections_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reflections
  FOR EACH ROW EXECUTE FUNCTION audit_reflections_changes();

-- ============================================================================
-- UTILITY FUNCTIONS FOR REFLECTION SYSTEM
-- ============================================================================

-- Function to get week boundaries (Monday to Sunday in Asia/Tokyo)
CREATE OR REPLACE FUNCTION get_week_boundaries(input_date DATE)
RETURNS TABLE (week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (input_date - INTERVAL '1 day' * (EXTRACT(DOW FROM input_date) - 1))::DATE as week_start,
    (input_date + INTERVAL '1 day' * (7 - EXTRACT(DOW FROM input_date)))::DATE as week_end;
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly study summary for AI context
CREATE OR REPLACE FUNCTION get_weekly_study_summary(
  p_student_id UUID,
  p_week_start DATE
)
RETURNS JSONB AS $$
DECLARE
  summary JSONB;
BEGIN
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'total_minutes', COALESCE(SUM(time_spent_minutes), 0),
    'avg_understanding', ROUND(AVG(understanding_level), 2),
    'subjects_distribution', json_object_agg(subject, subject_count),
    'understanding_distribution', json_build_object(
      'level_1', COUNT(CASE WHEN understanding_level = 1 THEN 1 END),
      'level_2', COUNT(CASE WHEN understanding_level = 2 THEN 1 END),
      'level_3', COUNT(CASE WHEN understanding_level = 3 THEN 1 END),
      'level_4', COUNT(CASE WHEN understanding_level = 4 THEN 1 END),
      'level_5', COUNT(CASE WHEN understanding_level = 5 THEN 1 END)
    ),
    'content_types', json_object_agg(content_type, content_count),
    'daily_streak', (
      SELECT COUNT(DISTINCT study_date) 
      FROM study_inputs 
      WHERE student_id = p_student_id 
        AND study_date BETWEEN p_week_start AND p_week_start + INTERVAL '6 days'
    )
  ) INTO summary
  FROM (
    SELECT 
      si.*,
      COUNT(*) OVER (PARTITION BY subject) as subject_count,
      COUNT(*) OVER (PARTITION BY content_type) as content_count
    FROM study_inputs si
    WHERE si.student_id = p_student_id
      AND si.study_date BETWEEN p_week_start AND p_week_start + INTERVAL '6 days'
  ) aggregated_data;
  
  RETURN COALESCE(summary, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if reflection is submittable (weekend only)
CREATE OR REPLACE FUNCTION is_reflection_submittable()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current time in Asia/Tokyo is weekend (Saturday or Sunday)
  RETURN EXTRACT(DOW FROM now() AT TIME ZONE 'Asia/Tokyo') IN (0, 6);
END;
$$ LANGUAGE plpgsql;

-- Function to validate reflection completeness
CREATE OR REPLACE FUNCTION validate_reflection_completeness(
  p_good_points TEXT,
  p_improvement_points TEXT,
  p_next_week_focus TEXT,
  p_emotion_score INTEGER
)
RETURNS TABLE (is_valid BOOLEAN, validation_errors TEXT[]) AS $$
DECLARE
  errors TEXT[] := '{}';
BEGIN
  -- Check required fields
  IF p_good_points IS NULL OR LENGTH(TRIM(p_good_points)) < 10 THEN
    errors := array_append(errors, 'よかった点は10文字以上で入力してください');
  END IF;
  
  IF p_emotion_score IS NULL OR p_emotion_score NOT BETWEEN 1 AND 5 THEN
    errors := array_append(errors, '今週の気持ちを1-5で選択してください');
  END IF;
  
  -- Optional but recommended fields
  IF p_improvement_points IS NULL OR LENGTH(TRIM(p_improvement_points)) < 5 THEN
    errors := array_append(errors, '改善点も記入することをお勧めします（5文字以上）');
  END IF;
  
  RETURN QUERY SELECT array_length(errors, 1) = 0 OR array_length(errors, 1) IS NULL, errors;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Rollback SQL (for reference):
-- DROP FUNCTION IF EXISTS validate_reflection_completeness(TEXT, TEXT, TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS is_reflection_submittable();
-- DROP FUNCTION IF EXISTS get_weekly_study_summary(UUID, DATE);
-- DROP FUNCTION IF EXISTS get_week_boundaries(DATE);
-- DROP TRIGGER IF EXISTS audit_reflections_trigger ON reflections;
-- DROP FUNCTION IF EXISTS audit_reflections_changes();
-- DROP TRIGGER IF EXISTS update_reflections_updated_at ON reflections;
-- DROP TABLE IF EXISTS reflections CASCADE;