-- Migration: Study Inputs & Learning Records
-- Created: 2025-01-07
-- Purpose: Core learning record storage with 3-level detail support
-- Depends: 20250107_000_auth_tables.sql
-- Rollback: DROP TABLE study_inputs CASCADE;

BEGIN;

-- ============================================================================
-- LEARNING RECORDS MANAGEMENT
-- ============================================================================

-- study_inputs table for learning records (REQ-001, AC-001)
CREATE TABLE study_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  study_date DATE NOT NULL, -- Asia/Tokyo基準
  subject VARCHAR(20) CHECK (subject IN ('math', 'japanese', 'science', 'social', 'english')) NOT NULL,
  content_type VARCHAR(20) CHECK (content_type IN ('class', 'homework', 'test_prep', 'exam_prep')) NOT NULL,
  understanding_level INTEGER CHECK (understanding_level BETWEEN 1 AND 5) NOT NULL, -- 1:難しい 〜 5:バッチリ理解
  time_spent_minutes INTEGER CHECK (time_spent_minutes > 0),
  memo TEXT,
  level_type VARCHAR(10) CHECK (level_type IN ('spark', 'flame', 'blaze')) DEFAULT 'spark' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES users(id) NOT NULL, -- 監査用
  
  -- 制約
  UNIQUE(student_id, study_date, subject, content_type), -- 1日1科目1種類のみ
  CONSTRAINT study_inputs_current_date_check 
    CHECK (study_date <= CURRENT_DATE)
);

-- インデックス (パフォーマンス重視)
CREATE INDEX idx_study_inputs_student_date ON study_inputs(student_id, study_date DESC);
CREATE INDEX idx_study_inputs_heatmap ON study_inputs(student_id, study_date, understanding_level);
CREATE INDEX idx_study_inputs_subject ON study_inputs(subject);
CREATE INDEX idx_study_inputs_updated_by ON study_inputs(updated_by);
CREATE INDEX idx_study_inputs_content_type ON study_inputs(content_type);

-- ============================================================================
-- ROW LEVEL SECURITY FOR STUDY INPUTS
-- ============================================================================

-- Enable RLS
ALTER TABLE study_inputs ENABLE ROW LEVEL SECURITY;

-- Students: can access their own records
CREATE POLICY students_own_study_inputs ON study_inputs
  FOR ALL USING (
    student_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND role = 'student' 
      AND status = 'active'
    )
  );

-- Parents: can view their children's records
CREATE POLICY parents_children_study_inputs ON study_inputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN memberships m ON m.user_id = psr.parent_id
      WHERE psr.parent_id = auth.uid()
      AND psr.student_id = study_inputs.student_id
      AND m.role = 'parent'
      AND m.status = 'active'
    )
  );

-- Coaches: can access students in their organization
CREATE POLICY coaches_org_students_study_inputs ON study_inputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships coach_m
      JOIN memberships student_m ON coach_m.scope_id = student_m.scope_id
      WHERE coach_m.user_id = auth.uid()
      AND coach_m.role = 'coach'
      AND coach_m.scope_type = 'org'
      AND coach_m.status = 'active'
      AND student_m.user_id = study_inputs.student_id
      AND student_m.role = 'student'
      AND student_m.status = 'active'
    )
  );

-- Admins: can access all records
CREATE POLICY admin_all_study_inputs ON study_inputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS & AUDIT LOGGING
-- ============================================================================

-- Trigger for updated_at
CREATE TRIGGER update_study_inputs_updated_at BEFORE UPDATE ON study_inputs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging function for study_inputs
CREATE OR REPLACE FUNCTION audit_study_inputs_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES ('study_inputs', OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('study_inputs', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES ('study_inputs', NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit trigger
CREATE TRIGGER audit_study_inputs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON study_inputs
  FOR EACH ROW EXECUTE FUNCTION audit_study_inputs_changes();

-- ============================================================================
-- UTILITY FUNCTIONS FOR AGGREGATION
-- ============================================================================

-- Function for calendar heatmap aggregation (AC-001)
CREATE OR REPLACE FUNCTION get_student_calendar_data(
  p_student_id UUID,
  p_month DATE
)
RETURNS TABLE (
  study_date DATE,
  subject_count INTEGER,
  total_records INTEGER,
  understanding_avg DECIMAL(3,2),
  color_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.study_date,
    COUNT(DISTINCT si.subject)::INTEGER as subject_count,
    COUNT(*)::INTEGER as total_records,
    ROUND(AVG(si.understanding_level), 2) as understanding_avg,
    CASE 
      WHEN COUNT(DISTINCT si.subject) >= 2 AND COUNT(CASE WHEN si.understanding_level >= 4 THEN 1 END) >= 2 THEN 'high'
      WHEN COUNT(DISTINCT si.subject) >= 2 AND COUNT(CASE WHEN si.understanding_level >= 3 THEN 1 END) >= 2 THEN 'medium'
      WHEN COUNT(*) >= 1 THEN 'low'
      ELSE 'none'
    END as color_level
  FROM study_inputs si
  WHERE si.student_id = p_student_id
    AND DATE_TRUNC('month', si.study_date) = DATE_TRUNC('month', p_month)
  GROUP BY si.study_date
  ORDER BY si.study_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Rollback SQL (for reference):
-- DROP TRIGGER IF EXISTS audit_study_inputs_trigger ON study_inputs;
-- DROP FUNCTION IF EXISTS audit_study_inputs_changes();
-- DROP FUNCTION IF EXISTS get_student_calendar_data(UUID, DATE);
-- DROP TRIGGER IF EXISTS update_study_inputs_updated_at ON study_inputs;
-- DROP TABLE IF EXISTS study_inputs CASCADE;