# StudySpark Database Design

**Spec-Version**: 0.1  
**Depends**: docs/01_requirements.md, docs/02_architecture.md, DECISIONS.md (TBD)  
**Document Status**: Initial Draft  
**Last Updated**: 2025-01-07

---

## 1. Entity Relationship Diagram (ERD)

### Core Tables Overview
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    users    │    │  profiles   │    │ memberships│
│ (auth data) │────│(user info)  │    │(role mgmt)  │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                  │
                           └──────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                                     │
        ┌─────────────┐                      ┌─────────────┐
        │study_inputs │                      │   invites   │
        │(学習記録)    │                      │(招待管理)    │
        └─────────────┘                      └─────────────┘
                   │
                   │
        ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
        │    goals    │    │reflections  │    │audit_logs   │
        │(目標管理)    │    │(振り返り)    │    │(監査ログ)    │
        └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 2. Table Definitions

### 2.1 Core Authentication & User Management

#### DB-001: users (認証情報)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### DB-002: profiles (プロフィール情報)
```sql
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
```

### 2.2 Access Control & Family Management

#### DB-003: memberships (所属・権限管理)
```sql
CREATE TABLE memberships (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### DB-004: parent_student_relations (親子関係)
```sql
CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### 2.3 Learning Records & Core Features

#### DB-005: study_inputs (学習記録) - REQ-001対応
```sql
CREATE TABLE study_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- インデックス
CREATE INDEX idx_study_inputs_student_date ON study_inputs(student_id, study_date DESC);
CREATE INDEX idx_study_inputs_heatmap ON study_inputs(student_id, study_date, understanding_level);
CREATE INDEX idx_study_inputs_subject ON study_inputs(subject);
CREATE INDEX idx_study_inputs_updated_by ON study_inputs(updated_by);
```

#### DB-006: goals (目標管理) - REQ-004対応
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CHECK ((is_achieved = true AND achieved_at IS NOT NULL) OR is_achieved = false)
);

-- インデックス
CREATE INDEX idx_goals_student_target_date ON goals(student_id, target_date DESC);
CREATE INDEX idx_goals_type_date ON goals(goal_type, target_date);
CREATE INDEX idx_goals_active ON goals(student_id, is_achieved) WHERE is_achieved = false;
```

#### DB-007: reflections (振り返り) - REQ-005対応
```sql
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL, -- その週の月曜日
  week_end_date DATE NOT NULL,   -- その週の日曜日
  good_points TEXT NOT NULL,
  improvement_points TEXT,
  next_week_focus TEXT,
  emotion_score INTEGER CHECK (emotion_score BETWEEN 1 AND 5), -- 1:辛い 〜 5:楽しい
  ai_feedback TEXT, -- AIからのフィードバック
  ai_suggestions JSONB, -- 次週への具体的提案
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 制約
  UNIQUE(student_id, week_start_date),
  CONSTRAINT reflections_week_validity_check 
    CHECK (week_end_date = week_start_date + INTERVAL '6 days'),
  CONSTRAINT reflections_week_monday_check 
    CHECK (EXTRACT(DOW FROM week_start_date) = 1) -- 月曜日開始
);

-- インデックス
CREATE INDEX idx_reflections_student_week ON reflections(student_id, week_start_date DESC);
CREATE INDEX idx_reflections_emotion ON reflections(emotion_score) WHERE emotion_score IS NOT NULL;
```

### 2.4 Security & Administration

#### DB-008: invites (招待管理)
```sql
CREATE TABLE invites (
  invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### DB-009: audit_logs (監査ログ)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

---

## 3. Row Level Security (RLS) Policy

### 3.1 RLS有効化
```sql
-- すべてのテーブルでRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### 3.2 RLS Policy定義

#### Students: 自分のデータのみアクセス
```sql
-- 生徒は自分の学習記録のみ参照・更新可能
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
```

#### Parents: 自分の子供のデータ参照
```sql
-- 保護者は紐付いた子供の学習記録を参照可能
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
```

#### Coaches: 担当生徒のデータアクセス
```sql
-- 指導者は同一organization内の生徒データにアクセス可能
CREATE POLICY coaches_org_students ON study_inputs
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
```

---

## 4. 典型的なクエリパターン

### 4.1 Read Queries

#### DB-READ-001: 生徒のホームダッシュボード
```sql
-- Daily missions + 学習カレンダー用
WITH today_missions AS (
  SELECT 
    si.subject,
    si.content_type,
    si.understanding_level,
    CASE 
      WHEN si.id IS NULL THEN '未入力'
      WHEN si.understanding_level >= 4 THEN 'バッチリ理解'
      WHEN si.understanding_level >= 3 THEN 'できた'
      ELSE '入力のみ'
    END as status
  FROM (
    VALUES ('math', 'class'), ('math', 'homework'),
           ('science', 'class'), ('science', 'homework'),
           ('social', 'class'), ('social', 'homework')
  ) AS expected(subject, content_type)
  LEFT JOIN study_inputs si ON si.student_id = $1
    AND si.study_date = CURRENT_DATE
    AND si.subject = expected.subject
    AND si.content_type = expected.content_type
),
calendar_data AS (
  SELECT 
    study_date,
    COUNT(DISTINCT subject) as subject_count,
    COUNT(CASE WHEN understanding_level >= 3 THEN 1 END) as good_count,
    AVG(understanding_level::decimal) as avg_understanding
  FROM study_inputs
  WHERE student_id = $1
    AND study_date >= date_trunc('month', CURRENT_DATE)
  GROUP BY study_date
  ORDER BY study_date
)
SELECT 
  json_build_object(
    'missions', (SELECT json_agg(row_to_json(tm)) FROM today_missions tm),
    'calendar', (SELECT json_agg(row_to_json(cd)) FROM calendar_data cd)
  ) as dashboard_data;
```

#### DB-READ-002: 保護者の子供一覧と状況
```sql
-- 保護者ダッシュボード用
SELECT 
  p.nickname,
  p.avatar,
  p.grade,
  recent_activity.days_since_last_record,
  recent_activity.this_week_count,
  recent_activity.avg_understanding
FROM parent_student_relations psr
JOIN profiles p ON p.user_id = psr.student_id
LEFT JOIN (
  SELECT 
    student_id,
    COALESCE(DATE_PART('day', CURRENT_DATE - MAX(study_date)), 999) as days_since_last_record,
    COUNT(CASE 
      WHEN study_date >= date_trunc('week', CURRENT_DATE) 
      THEN 1 
    END) as this_week_count,
    AVG(CASE 
      WHEN study_date >= CURRENT_DATE - INTERVAL '7 days' 
      THEN understanding_level::decimal 
    END) as avg_understanding
  FROM study_inputs
  WHERE study_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY student_id
) recent_activity ON recent_activity.student_id = psr.student_id
WHERE psr.parent_id = $1
ORDER BY p.nickname;
```

### 4.2 Write Queries

#### DB-WRITE-001: 学習記録の登録・更新
```sql
-- Upsert pattern for study inputs
INSERT INTO study_inputs (
  student_id, study_date, subject, content_type, 
  understanding_level, time_spent_minutes, memo, level_type, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (student_id, study_date, subject, content_type)
DO UPDATE SET
  understanding_level = EXCLUDED.understanding_level,
  time_spent_minutes = EXCLUDED.time_spent_minutes,
  memo = EXCLUDED.memo,
  level_type = EXCLUDED.level_type,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by
RETURNING id, created_at, updated_at;
```

#### DB-WRITE-002: 週間振り返りの保存
```sql
-- 週間振り返りデータ + AI フィードバック生成
WITH week_bounds AS (
  SELECT 
    date_trunc('week', $2::date)::date as week_start,
    (date_trunc('week', $2::date) + INTERVAL '6 days')::date as week_end
),
reflection_insert AS (
  INSERT INTO reflections (
    student_id, week_start_date, week_end_date,
    good_points, improvement_points, next_week_focus, emotion_score
  )
  SELECT $1, wb.week_start, wb.week_end, $3, $4, $5, $6
  FROM week_bounds wb
  ON CONFLICT (student_id, week_start_date)
  DO UPDATE SET
    good_points = EXCLUDED.good_points,
    improvement_points = EXCLUDED.improvement_points,
    next_week_focus = EXCLUDED.next_week_focus,
    emotion_score = EXCLUDED.emotion_score,
    updated_at = now()
  RETURNING id
)
SELECT r.id, r.week_start_date, r.week_end_date
FROM reflection_insert ri
JOIN reflections r ON r.id = ri.id;
```

---

## 5. Migration運用方針

### 5.1 命名規則

| Type | Pattern | Example |
|------|---------|---------|
| テーブル作成 | `YYYY-MM-DD_create_table_name.sql` | `2024-01-15_create_study_inputs.sql` |
| インデックス追加 | `YYYY-MM-DD_add_index_table_column.sql` | `2024-01-16_add_index_study_inputs_date.sql` |
| データ修正 | `YYYY-MM-DD_update_data_description.sql` | `2024-01-17_update_data_fix_timezones.sql` |
| RLS追加 | `YYYY-MM-DD_add_rls_table_name.sql` | `2024-01-18_add_rls_study_inputs.sql` |

### 5.2 Migration Structure
```sql
-- 各migrationファイルの基本構造
-- 2024-01-15_create_study_inputs.sql

-- Forward migration
BEGIN;

-- DDL statements
CREATE TABLE IF NOT EXISTS study_inputs (...);

-- Index creation
CREATE INDEX IF NOT EXISTS idx_study_inputs_student_date ...;

-- RLS setup
ALTER TABLE study_inputs ENABLE ROW LEVEL SECURITY;

-- Data seeding (if needed)
INSERT INTO study_inputs (...) ON CONFLICT DO NOTHING;

COMMIT;

-- Rollback instructions (comment)
-- DROP TABLE study_inputs CASCADE;
-- DROP INDEX idx_study_inputs_student_date;
```

### 5.3 ロールバック方針

| Migration Type | Rollback Strategy | Risk Level |
|----------------|------------------|------------|
| **新テーブル作成** | DROP TABLE CASCADE | Low |
| **カラム追加** | ALTER TABLE DROP COLUMN | Medium |
| **インデックス追加** | DROP INDEX | Low |
| **データ更新** | 事前バックアップから復元 | High |
| **RLS変更** | 旧Policy復元 | Medium |

### 5.4 環境別適用順序
1. **Development** (local)
2. **Staging** (Supabase staging project)  
3. **Production** (manual approval required)

---

## 6. Monitoring & Performance

### 6.1 パフォーマンス監視クエリ
```sql
-- 重いクエリの特定
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_tup_read DESC;

-- インデックス使用率
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 6.2 容量監視
```sql
-- テーブルサイズ監視
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 7. Traceability Matrix

### Requirements to Database Mapping

| Req ID | DB Component | DB ID | Query Pattern | Notes |
|--------|--------------|-------|---------------|-------|
| REQ-001 | study_inputs table | DB-005 | DB-READ-001, DB-WRITE-001 | 学習記録の登録・表示 |
| REQ-001 | Calendar visualization | DB-READ-001 | Aggregation query | GitHub風ヒートマップ |
| REQ-002 | parent_student_relations | DB-004 | DB-READ-002 | 親子関係に基づくデータアクセス |
| REQ-002 | Parent dashboard | DB-READ-002 | Multi-student aggregation | 保護者向け一覧表示 |
| REQ-003 | memberships + RLS | DB-003 | Coach access policy | 指導者のアクセス制御 |
| REQ-003 | Coach dashboard | DB-READ-003 | Organization-based query | 担当生徒の優先度表示 |
| REQ-004 | goals table | DB-006 | SMART goal tracking | AI支援目標設定 |
| REQ-004 | AI coaching integration | DB-006 | Goal progress queries | GROWモデル対話記録 |
| REQ-005 | reflections table | DB-007 | DB-WRITE-002 | 週次振り返りデータ |
| REQ-005 | AI feedback | DB-007 | Weekly aggregation | セルフコンパッション促進 |

### API to Database Mapping

| API Endpoint | Database Operations | Table(s) | Query ID |
|-------------|-------------------|----------|----------|
| `/api/spark/record` | INSERT/UPDATE study_inputs | study_inputs | DB-WRITE-001 |
| `/api/parent/dashboard` | SELECT child progress | study_inputs, profiles | DB-READ-002 |
| `/api/coach/students` | SELECT org students | memberships, profiles | DB-READ-003 |
| `/api/goal/ai-coaching` | INSERT/UPDATE goals | goals | DB-WRITE-003 |
| `/api/reflect/weekly` | INSERT/UPDATE reflections | reflections | DB-WRITE-002 |

---

## 8. Security Compliance

### 8.1 データ分類

| Classification | Tables | Protection Method | Retention |
|---------------|--------|------------------|-----------|
| **Personal Identifiable** | users.email, profiles.real_name | Encrypted at rest, RLS | 1年卒業後 |
| **Sensitive Academic** | study_inputs, goals, reflections | RLS + Family isolation | 1年卒業後 |
| **Metadata** | memberships, audit_logs | RLS + Organization isolation | 7年監査用 |
| **Public** | - | - | - |

### 8.2 GDPR対応
```sql
-- 個人データ削除（Right to erasure）
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- プロフィール匿名化
  UPDATE profiles SET 
    real_name = 'Anonymous',
    real_name_kana = 'アノニマス',
    nickname = 'User-' || EXTRACT(epoch FROM now())::text
  WHERE user_id = user_uuid;
  
  -- 学習記録の個人特定情報削除（統計は保持）
  UPDATE study_inputs SET memo = '[deleted]' 
  WHERE student_id = user_uuid AND memo IS NOT NULL;
  
  -- 振り返りの個人的内容削除
  UPDATE reflections SET 
    good_points = '[anonymized]',
    improvement_points = '[anonymized]',
    next_week_focus = '[anonymized]'
  WHERE student_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-07 | System | Initial database design from requirements & architecture |