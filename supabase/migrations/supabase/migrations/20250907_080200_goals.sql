-- Migration: Goals Management with AI Coaching Support
-- Created: 2025-01-07
-- Purpose: SMART goal tracking with AI coaching integration
-- Depends: 20250107_000_auth_tables.sql, 20250107_001_study_inputs.sql
-- Rollback: DROP TABLE goals CASCADE;

BEGIN;

-- ============================================================================
-- GOAL MANAGEMENT SYSTEM
-- ============================================================================

-- goals table for SMART goal tracking (REQ-004, AC-004)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  goal_type VARCHAR(20) CHECK (goal_type IN ('weekly_test', 'monthly_exam', 'behavior')) NOT NULL,
  target_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value DECIMAL(5,2), -- 目標点数・時間等
  target_unit VARCHAR(20), -- 'points', 'minutes', 'times'
  current_value DECIMAL(5,2) DEFAULT 0,
  is_achieved BOOLEAN DEFAULT false,
  is_smart_compliant BOOLEAN DEFAULT false, -- SMART原則チェック済み
  ai_coaching_session_id UUID, -- AI対話セッション紐付け
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  achieved_at TIMESTAMPTZ,
  
  -- 制約
  CONSTRAINT goals_target_positive_check 
    CHECK (target_value IS NULL OR target_value > 0),
  CONSTRAINT goals_achievement_consistency_check 
    CHECK ((is_achieved = true AND achieved_at IS NOT NULL) OR is_achieved = false),
  CONSTRAINT goals_future_target_check
    CHECK (target_date >= CURRENT_DATE - INTERVAL '1 day') -- 過去1日まで許可（タイムゾーン考慮）
);

-- インデックス
CREATE INDEX idx_goals_student_target_date ON goals(student_id, target_date DESC);
CREATE INDEX idx_goals_type_date ON goals(goal_type, target_date);
CREATE INDEX idx_goals_active ON goals(student_id, is_achieved) WHERE is_achieved = false;
CREATE INDEX idx_goals_ai_session ON goals(ai_coaching_session_id) WHERE ai_coaching_session_id IS NOT NULL;

-- ============================================================================
-- AI COACHING SESSIONS TRACKING
-- ============================================================================

-- ai_coaching_sessions table for conversation tracking
CREATE TABLE ai_coaching_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_type VARCHAR(20) CHECK (session_type IN ('goal_setting', 'reflection', 'encouragement')) NOT NULL,
  grow_stage VARCHAR(10) CHECK (grow_stage IN ('goal', 'reality', 'options', 'will')) DEFAULT 'goal',
  conversation_history JSONB DEFAULT '[]', -- メッセージ履歴
  context_data JSONB DEFAULT '{}', -- セッションコンテキスト
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- 制約
  CONSTRAINT ai_sessions_completion_consistency_check
    CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status != 'completed')
);

-- インデックス
CREATE INDEX idx_ai_sessions_student ON ai_coaching_sessions(student_id, created_at DESC);
CREATE INDEX idx_ai_sessions_status ON ai_coaching_sessions(status) WHERE status = 'active';
CREATE INDEX idx_ai_sessions_type ON ai_coaching_sessions(session_type);

-- ============================================================================
-- ROW LEVEL SECURITY FOR GOALS
-- ============================================================================

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Students: can access their own goals
CREATE POLICY students_own_goals ON goals
  FOR ALL USING (
    student_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND role = 'student' 
      AND status = 'active'
    )
  );

-- Parents: can view their children's goals (readonly)
CREATE POLICY parents_children_goals ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN memberships m ON m.user_id = psr.parent_id
      WHERE psr.parent_id = auth.uid()
      AND psr.student_id = goals.student_id
      AND m.role = 'parent'
      AND m.status = 'active'
    )
  );

-- Coaches: can access and update students' goals in their organization
CREATE POLICY coaches_org_students_goals ON goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships coach_m
      JOIN memberships student_m ON coach_m.scope_id = student_m.scope_id
      WHERE coach_m.user_id = auth.uid()
      AND coach_m.role = 'coach'
      AND coach_m.scope_type = 'org'
      AND coach_m.status = 'active'
      AND student_m.user_id = goals.student_id
      AND student_m.role = 'student'
      AND student_m.status = 'active'
    )
  );

-- AI Coaching Sessions RLS (same pattern as goals)
CREATE POLICY students_own_ai_sessions ON ai_coaching_sessions
  FOR ALL USING (
    student_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND role = 'student' 
      AND status = 'active'
    )
  );

CREATE POLICY coaches_students_ai_sessions ON ai_coaching_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships coach_m
      JOIN memberships student_m ON coach_m.scope_id = student_m.scope_id
      WHERE coach_m.user_id = auth.uid()
      AND coach_m.role = 'coach'
      AND coach_m.scope_type = 'org'
      AND coach_m.status = 'active'
      AND student_m.user_id = ai_coaching_sessions.student_id
      AND student_m.role = 'student'
      AND student_m.status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS & AUDIT LOGGING
-- ============================================================================

-- Triggers for updated_at
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging for goals
CREATE OR REPLACE FUNCTION audit_goals_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES ('goals', OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('goals', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES ('goals', NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_goals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION audit_goals_changes();

-- ============================================================================
-- UTILITY FUNCTIONS FOR GOAL MANAGEMENT
-- ============================================================================

-- Function to check SMART criteria compliance
CREATE OR REPLACE FUNCTION validate_smart_goal(
  p_title TEXT,
  p_description TEXT,
  p_target_value DECIMAL,
  p_target_unit TEXT,
  p_target_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- SMART criteria check
  -- S: Specific (title length > 10, description exists)
  -- M: Measurable (target_value and unit exist)
  -- A: Achievable (checked by AI, defaulting to true)
  -- R: Relevant (context-based, defaulting to true)  
  -- T: Time-bound (target_date in future)
  
  RETURN (
    LENGTH(p_title) >= 10 AND
    p_description IS NOT NULL AND
    LENGTH(p_description) >= 20 AND
    p_target_value IS NOT NULL AND
    p_target_unit IS NOT NULL AND
    p_target_date > CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update goal progress based on study inputs
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  goal_record RECORD;
BEGIN
  -- 学習記録の更新/追加時に関連する目標の進捗を更新
  FOR goal_record IN 
    SELECT g.id, g.goal_type, g.target_value, g.target_unit
    FROM goals g
    WHERE g.student_id = NEW.student_id
      AND g.is_achieved = false
      AND g.target_date >= NEW.study_date
  LOOP
    -- 目標タイプに応じた進捗計算
    IF goal_record.goal_type = 'behavior' AND goal_record.target_unit = 'times' THEN
      -- 行動目標（回数ベース）
      UPDATE goals 
      SET current_value = (
        SELECT COUNT(*) FROM study_inputs 
        WHERE student_id = NEW.student_id 
          AND study_date >= CURRENT_DATE - INTERVAL '7 days'
      ),
      is_achieved = (
        SELECT COUNT(*) FROM study_inputs 
        WHERE student_id = NEW.student_id 
          AND study_date >= CURRENT_DATE - INTERVAL '7 days'
      ) >= goal_record.target_value
      WHERE id = goal_record.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update goal progress when study inputs change
CREATE TRIGGER update_goal_progress_trigger
  AFTER INSERT OR UPDATE ON study_inputs
  FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

COMMIT;

-- Rollback SQL (for reference):
-- DROP TRIGGER IF EXISTS update_goal_progress_trigger ON study_inputs;
-- DROP FUNCTION IF EXISTS update_goal_progress();
-- DROP FUNCTION IF EXISTS validate_smart_goal(TEXT, TEXT, DECIMAL, TEXT, DATE);
-- DROP TRIGGER IF EXISTS audit_goals_trigger ON goals;
-- DROP FUNCTION IF EXISTS audit_goals_changes();
-- DROP TRIGGER IF EXISTS update_ai_sessions_updated_at ON ai_coaching_sessions;
-- DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
-- DROP TABLE IF EXISTS ai_coaching_sessions CASCADE;
-- DROP TABLE IF EXISTS goals CASCADE;