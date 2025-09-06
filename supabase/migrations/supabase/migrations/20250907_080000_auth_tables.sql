-- Migration: Authentication & User Management Tables
-- Created: 2025-01-07
-- Purpose: Core authentication, profiles, and role management
-- Depends: None
-- Rollback: DROP TABLE users, profiles, memberships, parent_student_relations, invites, audit_logs CASCADE;

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE AUTHENTICATION
-- ============================================================================

-- users table for authentication info
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE, -- 保護者/指導者用 
  login_id VARCHAR(50) UNIQUE, -- 生徒用
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  CONSTRAINT users_auth_method_check 
    CHECK ((email IS NOT NULL) OR (login_id IS NOT NULL)),
  CONSTRAINT users_email_format_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_login_id_format_check 
    CHECK (login_id ~* '^[A-Za-z0-9]{4,20}$')
);

-- インデックス
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_login_id ON users(login_id) WHERE login_id IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- profiles table for user information
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  real_name VARCHAR(100),
  real_name_kana VARCHAR(100),
  nickname VARCHAR(50),
  avatar VARCHAR(20) CHECK (avatar ~ '^(student|parent|coach)[1-6]$'),
  grade INTEGER CHECK (grade BETWEEN 4 AND 6),
  timezone VARCHAR(50) DEFAULT 'Asia/Tokyo' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  CONSTRAINT profiles_real_name_kana_check 
    CHECK (real_name_kana ~* '^[あ-んー]*$')
);

-- インデックス
CREATE INDEX idx_profiles_grade ON profiles(grade) WHERE grade IS NOT NULL;
CREATE INDEX idx_profiles_avatar ON profiles(avatar);

-- ============================================================================
-- ROLE & MEMBERSHIP MANAGEMENT
-- ============================================================================

-- memberships table for role and scope management
CREATE TABLE memberships (
  membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  scope_type VARCHAR(20) CHECK (scope_type IN ('family', 'org')) NOT NULL,
  scope_id UUID NOT NULL, -- family_id or organization_id
  role VARCHAR(20) CHECK (role IN ('parent', 'coach', 'admin', 'student')) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'invited', 'revoked')) DEFAULT 'active' NOT NULL,
  invited_by UUID REFERENCES users(id),
  invite_id UUID,
  permissions JSONB DEFAULT '{}', -- 細かい権限制御用
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  UNIQUE(user_id, scope_type, scope_id, role),
  CONSTRAINT memberships_invite_consistency_check 
    CHECK ((status = 'invited' AND invited_by IS NOT NULL) OR status != 'invited')
);

-- インデックス
CREATE INDEX idx_memberships_user_scope ON memberships(user_id, scope_type, scope_id);
CREATE INDEX idx_memberships_scope_role ON memberships(scope_type, scope_id, role);
CREATE INDEX idx_memberships_status ON memberships(status) WHERE status != 'active';

-- parent_student_relations table for family relationships
CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID NOT NULL,
  relationship_type VARCHAR(20) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  UNIQUE(parent_id, student_id),
  UNIQUE(student_id, family_id), -- 1生徒は1家族のみ
  CONSTRAINT parent_student_different_check 
    CHECK (parent_id != student_id)
);

-- インデックス
CREATE INDEX idx_parent_student_family ON parent_student_relations(family_id);
CREATE INDEX idx_parent_student_parent ON parent_student_relations(parent_id);
CREATE INDEX idx_parent_student_student ON parent_student_relations(student_id);

-- ============================================================================
-- INVITATION MANAGEMENT
-- ============================================================================

-- invites table for secure invitation system
CREATE TABLE invites (
  invite_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash TEXT NOT NULL, -- bcryptハッシュ
  token TEXT UNIQUE, -- URLトークン用
  role VARCHAR(20) CHECK (role IN ('parent', 'coach', 'admin')) NOT NULL,
  scope_type VARCHAR(20) CHECK (scope_type IN ('family', 'org')) NOT NULL,
  scope_id UUID NOT NULL,
  target_email VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  created_by UUID REFERENCES users(id) NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  CONSTRAINT invites_usage_limit_check CHECK (used_count <= max_uses),
  CONSTRAINT invites_expiry_future_check CHECK (expires_at > created_at)
);

-- インデックス
CREATE INDEX idx_invites_token ON invites(token) WHERE token IS NOT NULL;
CREATE INDEX idx_invites_expires ON invites(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_invites_target_email ON invites(target_email) WHERE target_email IS NOT NULL;

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- audit_logs table for change tracking
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- パーティション用（月単位）
  CONSTRAINT audit_logs_created_at_check 
    CHECK (created_at >= '2024-01-01'::timestamptz)
);

-- インデックス
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added in subsequent migrations specific to each feature

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Rollback SQL (for reference):
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
-- DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS invites CASCADE;
-- DROP TABLE IF EXISTS parent_student_relations CASCADE;
-- DROP TABLE IF EXISTS memberships CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;