-- ============================================================================
-- Phase 0: 認証・プロフィールテーブル作成
-- ============================================================================

-- ロール型定義（既存の場合はスキップ）
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'parent', 'coach', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- コース型定義（既存の場合はスキップ）
DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('A', 'B', 'C', 'S');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- profiles: 全ユーザー共通プロフィール
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- RLS有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のプロフィールのみ閲覧・更新可能
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- students: 生徒詳細情報
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_id VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  furigana VARCHAR(100),
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  course course_level DEFAULT 'A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_students_user_id ON public.students(user_id);
CREATE UNIQUE INDEX idx_students_login_id ON public.students(login_id);
CREATE INDEX idx_students_grade ON public.students(grade);
CREATE INDEX idx_students_course ON public.students(course);

-- RLS有効化
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分のデータのみ閲覧・更新可能
CREATE POLICY "Students can view own data"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students can update own data"
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- parents: 保護者詳細情報
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  furigana VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_parents_user_id ON public.parents(user_id);

-- RLS有効化
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 保護者は自分のデータのみ閲覧・更新可能
CREATE POLICY "Parents can view own data"
  ON public.parents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Parents can update own data"
  ON public.parents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- coaches: 指導者詳細情報
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coaches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  furigana VARCHAR(100),
  invitation_code UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_coaches_user_id ON public.coaches(user_id);

-- RLS有効化
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 指導者は自分のデータのみ閲覧・更新可能
CREATE POLICY "Coaches can view own data"
  ON public.coaches
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coaches can update own data"
  ON public.coaches
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- admins: 管理者情報
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  invitation_code UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_admins_user_id ON public.admins(user_id);

-- RLS有効化
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 管理者は自分のデータのみ閲覧可能
CREATE POLICY "Admins can view own data"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- invitation_codes: 招待コード管理
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id BIGSERIAL PRIMARY KEY,
  code UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  role user_role NOT NULL CHECK (role IN ('coach', 'admin')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX idx_invitation_codes_role ON public.invitation_codes(role);
CREATE INDEX idx_invitation_codes_used_by ON public.invitation_codes(used_by);

-- RLS有効化
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 管理者のみ招待コードを管理可能
CREATE POLICY "Admins can manage invitation codes"
  ON public.invitation_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- トリガー: updated_at自動更新
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- students
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- parents
CREATE TRIGGER update_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- coaches
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 関数: 生徒ログインID自動生成
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_student_login_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  counter INT := 0;
BEGIN
  LOOP
    -- student_YYYYMMDD_XXX形式で生成
    new_id := 'student_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || LPAD(floor(random() * 1000)::TEXT, 3, '0');

    -- 重複チェック
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE login_id = new_id) THEN
      RETURN new_id;
    END IF;

    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique login_id after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- コメント
-- ============================================================================
COMMENT ON TABLE public.profiles IS '全ユーザー共通プロフィール';
COMMENT ON TABLE public.students IS '生徒詳細情報';
COMMENT ON TABLE public.parents IS '保護者詳細情報';
COMMENT ON TABLE public.coaches IS '指導者詳細情報';
COMMENT ON TABLE public.admins IS '管理者情報';
COMMENT ON TABLE public.invitation_codes IS '招待コード管理（coach/admin用）';
-- ============================================================================
-- 02: 関係テーブル (親子関係・指導者-生徒関係)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 保護者-生徒、指導者-生徒の関係を管理するテーブル

-- ----------------------------------------------------------------------------
-- parent_child_relations: 保護者-生徒関係
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_child_relations (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation_type VARCHAR(20) CHECK (relation_type IN ('father', 'mother', 'guardian')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ親子ペアは1回のみ
  UNIQUE (parent_id, student_id)
);

-- インデックス
CREATE INDEX idx_parent_child_parent ON public.parent_child_relations(parent_id);
CREATE INDEX idx_parent_child_student ON public.parent_child_relations(student_id);

-- RLS有効化
ALTER TABLE public.parent_child_relations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 保護者は自分の子どもとの関係のみ閲覧
CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 生徒は自分の親との関係のみ閲覧
CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all parent-child relations"
  ON public.parent_child_relations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- コメント
COMMENT ON TABLE public.parent_child_relations IS '保護者-生徒の関係テーブル';
COMMENT ON COLUMN public.parent_child_relations.relation_type IS '関係タイプ: father, mother, guardian';

-- ----------------------------------------------------------------------------
-- coach_student_relations: 指導者-生徒関係
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_student_relations (
  id BIGSERIAL PRIMARY KEY,
  coach_id BIGINT NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),

  -- 同じ指導者-生徒ペアは1回のみ
  UNIQUE (coach_id, student_id)
);

-- インデックス
CREATE INDEX idx_coach_student_coach ON public.coach_student_relations(coach_id);
CREATE INDEX idx_coach_student_student ON public.coach_student_relations(student_id);

-- RLS有効化
ALTER TABLE public.coach_student_relations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 指導者は自分の担当生徒のみ閲覧
CREATE POLICY "Coaches can view own students relations"
  ON public.coach_student_relations FOR SELECT TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM public.coaches WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 生徒は自分の担当指導者のみ閲覧
CREATE POLICY "Students can view own coaches relations"
  ON public.coach_student_relations FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all coach-student relations"
  ON public.coach_student_relations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- コメント
COMMENT ON TABLE public.coach_student_relations IS '指導者-生徒の関係テーブル';
COMMENT ON COLUMN public.coach_student_relations.assigned_by IS 'アサインを実行した管理者のUUID';
-- ============================================================================
-- 03: マスタデータテーブル (学習回・科目・学習内容・問題数)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 学習回、科目、学習内容、問題数のマスタテーブル

-- ----------------------------------------------------------------------------
-- study_sessions: 学習回マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  session_number SMALLINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×回数の組み合わせは一意
  UNIQUE (grade, session_number)
);

-- インデックス
CREATE INDEX idx_study_sessions_grade ON public.study_sessions(grade);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view study sessions"
  ON public.study_sessions FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage study sessions"
  ON public.study_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.study_sessions IS '学習回マスタ (小5: 19回, 小6: 15回)';

-- ----------------------------------------------------------------------------
-- subjects: 科目マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order SMALLINT NOT NULL,
  color_code VARCHAR(7), -- カレンダー表示用カラー (#RRGGBB)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.subjects IS '科目マスタ (算数、国語、理科、社会)';
COMMENT ON COLUMN public.subjects.color_code IS 'カレンダー表示用カラーコード';

-- ----------------------------------------------------------------------------
-- study_content_types: 学習内容タイプマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_content_types (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  course course_level NOT NULL,
  content_name VARCHAR(100) NOT NULL,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×科目×コース×内容名は一意
  UNIQUE (grade, subject_id, course, content_name)
);

-- インデックス
CREATE INDEX idx_study_content_grade_subject_course ON public.study_content_types(grade, subject_id, course);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.study_content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view study content types"
  ON public.study_content_types FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage study content types"
  ON public.study_content_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.study_content_types IS '学習内容タイプマスタ (学年・科目・コース別)';
COMMENT ON COLUMN public.study_content_types.content_name IS '例: 類題、基本問題、１行問題など';

-- ----------------------------------------------------------------------------
-- problem_counts: 問題数マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.problem_counts (
  id BIGSERIAL PRIMARY KEY,
  study_content_type_id BIGINT NOT NULL REFERENCES public.study_content_types(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  total_problems SMALLINT NOT NULL CHECK (total_problems > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学習内容×学習回の組み合わせは一意
  UNIQUE (study_content_type_id, session_id)
);

-- インデックス
CREATE INDEX idx_problem_counts_content_type ON public.problem_counts(study_content_type_id);
CREATE INDEX idx_problem_counts_session ON public.problem_counts(session_id);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.problem_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view problem counts"
  ON public.problem_counts FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage problem counts"
  ON public.problem_counts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.problem_counts IS '問題数マスタ (学習内容×学習回ごとの問題数)';
COMMENT ON COLUMN public.problem_counts.total_problems IS '該当学習回における問題数';
-- ============================================================================
-- 04: ログテーブル (学習ログ・応援ログ)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 学習記録、応援メッセージのログテーブル

-- ----------------------------------------------------------------------------
-- study_logs: 学習ログ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  study_content_type_id BIGINT NOT NULL REFERENCES public.study_content_types(id) ON DELETE CASCADE,

  correct_count SMALLINT NOT NULL CHECK (correct_count >= 0),
  total_problems SMALLINT NOT NULL CHECK (total_problems > 0),

  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1, -- 楽観的ロック用

  -- 同じ生徒×学習回×科目×学習内容の組み合わせは一意
  UNIQUE (student_id, session_id, subject_id, study_content_type_id),

  -- 正答数は問題数以下
  CHECK (correct_count <= total_problems)
);

-- インデックス
CREATE INDEX idx_study_logs_student ON public.study_logs(student_id);
CREATE INDEX idx_study_logs_logged_at ON public.study_logs(logged_at DESC);
CREATE INDEX idx_study_logs_student_session ON public.study_logs(student_id, session_id);

-- RLS有効化
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分のログのみ閲覧・編集
CREATE POLICY "Students can manage own study logs"
  ON public.study_logs FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どものログを閲覧のみ
CREATE POLICY "Parents can view children study logs"
  ON public.study_logs FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒のログを閲覧のみ
CREATE POLICY "Coaches can view assigned students study logs"
  ON public.study_logs FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all study logs"
  ON public.study_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_study_logs_updated_at
  BEFORE UPDATE ON public.study_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.study_logs IS '生徒の学習記録ログ';
COMMENT ON COLUMN public.study_logs.version IS '楽観的ロック用バージョン番号';

-- ----------------------------------------------------------------------------
-- encouragement_messages: 応援メッセージ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encouragement_messages (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL CHECK (sender_role IN ('parent', 'coach')),

  message TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_cache_key VARCHAR(255), -- AIキャッシュ参照用

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_encouragement_student ON public.encouragement_messages(student_id);
CREATE INDEX idx_encouragement_sent_at ON public.encouragement_messages(sent_at DESC);
CREATE INDEX idx_encouragement_sender ON public.encouragement_messages(sender_id);

-- RLS有効化
ALTER TABLE public.encouragement_messages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分宛のメッセージのみ閲覧・既読更新
CREATE POLICY "Students can view and mark read own messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update read status on own messages"
  ON public.encouragement_messages FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子ども宛のメッセージ閲覧・送信
CREATE POLICY "Parents can view children messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can send messages to children"
  ON public.encouragement_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒宛のメッセージ閲覧・送信
CREATE POLICY "Coaches can view assigned students messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can send messages to assigned students"
  ON public.encouragement_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all encouragement messages"
  ON public.encouragement_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.encouragement_messages IS '保護者・指導者から生徒への応援メッセージ';
COMMENT ON COLUMN public.encouragement_messages.ai_cache_key IS 'AIキャッシュテーブル参照用キー';
-- ============================================================================
-- 05: 目標・実績テーブル (ゴールナビ)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: テスト目標、実績、達成マップのテーブル

-- ----------------------------------------------------------------------------
-- test_types: テストタイプマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_types (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  name VARCHAR(100) NOT NULL,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×テスト名は一意
  UNIQUE (grade, name)
);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view test types"
  ON public.test_types FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage test types"
  ON public.test_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.test_types IS 'テストタイプマスタ (組分けテスト、合不合判定テスト)';

-- ----------------------------------------------------------------------------
-- test_schedules: テスト日程マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_schedules (
  id BIGSERIAL PRIMARY KEY,
  test_type_id BIGINT NOT NULL REFERENCES public.test_types(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  test_number SMALLINT NOT NULL,

  -- 目標設定可能期間
  goal_setting_start_date DATE NOT NULL,
  goal_setting_end_date DATE NOT NULL,

  -- 実績入力可能期間
  result_entry_start_date DATE,
  result_entry_end_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- テストタイプ×回数は一意
  UNIQUE (test_type_id, test_number),

  -- 日程の妥当性チェック
  CHECK (goal_setting_start_date <= goal_setting_end_date),
  CHECK (result_entry_start_date IS NULL OR result_entry_start_date <= result_entry_end_date)
);

-- インデックス
CREATE INDEX idx_test_schedules_test_type ON public.test_schedules(test_type_id);
CREATE INDEX idx_test_schedules_test_date ON public.test_schedules(test_date);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.test_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view test schedules"
  ON public.test_schedules FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage test schedules"
  ON public.test_schedules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.test_schedules IS 'テスト日程マスタ';
COMMENT ON COLUMN public.test_schedules.goal_setting_start_date IS '目標設定開始日';
COMMENT ON COLUMN public.test_schedules.goal_setting_end_date IS '目標設定終了日';

-- ----------------------------------------------------------------------------
-- test_goals: テスト目標
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_goals (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  test_schedule_id BIGINT NOT NULL REFERENCES public.test_schedules(id) ON DELETE CASCADE,

  -- 4科目別目標点数
  math_target SMALLINT CHECK (math_target >= 0),
  japanese_target SMALLINT CHECK (japanese_target >= 0),
  science_target SMALLINT CHECK (science_target >= 0),
  social_target SMALLINT CHECK (social_target >= 0),
  total_target SMALLINT CHECK (total_target >= 0),

  -- AI対話から生成された「今回の思い」
  commitment_text TEXT,

  -- AI対話ログ参照 (オプション)
  ai_session_id BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×テストの組み合わせは一意
  UNIQUE (student_id, test_schedule_id)
);

-- インデックス
CREATE INDEX idx_test_goals_student ON public.test_goals(student_id);
CREATE INDEX idx_test_goals_schedule ON public.test_goals(test_schedule_id);

-- RLS有効化
ALTER TABLE public.test_goals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分の目標のみ閲覧・編集
CREATE POLICY "Students can manage own test goals"
  ON public.test_goals FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どもの目標を閲覧のみ
CREATE POLICY "Parents can view children test goals"
  ON public.test_goals FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒の目標を閲覧のみ
CREATE POLICY "Coaches can view assigned students test goals"
  ON public.test_goals FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all test goals"
  ON public.test_goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_test_goals_updated_at
  BEFORE UPDATE ON public.test_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.test_goals IS 'テスト目標 (ゴールナビで設定)';
COMMENT ON COLUMN public.test_goals.commitment_text IS 'AI対話から生成された「今回の思い」';

-- ----------------------------------------------------------------------------
-- test_results: テスト実績
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_results (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  test_schedule_id BIGINT NOT NULL REFERENCES public.test_schedules(id) ON DELETE CASCADE,

  -- 4科目別実績点数
  math_score SMALLINT CHECK (math_score >= 0),
  japanese_score SMALLINT CHECK (japanese_score >= 0),
  science_score SMALLINT CHECK (science_score >= 0),
  social_score SMALLINT CHECK (social_score >= 0),
  total_score SMALLINT CHECK (total_score >= 0),

  -- 偏差値 (オプション)
  math_deviation DECIMAL(4, 1),
  japanese_deviation DECIMAL(4, 1),
  science_deviation DECIMAL(4, 1),
  social_deviation DECIMAL(4, 1),
  total_deviation DECIMAL(4, 1),

  result_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×テストの組み合わせは一意
  UNIQUE (student_id, test_schedule_id)
);

-- インデックス
CREATE INDEX idx_test_results_student ON public.test_results(student_id);
CREATE INDEX idx_test_results_schedule ON public.test_results(test_schedule_id);

-- RLS有効化
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分の実績のみ閲覧・編集
CREATE POLICY "Students can manage own test results"
  ON public.test_results FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どもの実績を閲覧のみ
CREATE POLICY "Parents can view children test results"
  ON public.test_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒の実績を閲覧のみ
CREATE POLICY "Coaches can view assigned students test results"
  ON public.test_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all test results"
  ON public.test_results FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_test_results_updated_at
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.test_results IS 'テスト実績 (達成マップで表示)';
COMMENT ON COLUMN public.test_results.total_deviation IS '4科目合計の偏差値';
-- ============================================================================
-- 06: コーチングテーブル (週次振り返り・週次分析)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 週次振り返り、週次分析、AIキャッシュのテーブル

-- ----------------------------------------------------------------------------
-- coaching_sessions: コーチングセッション (週次振り返り)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 週の識別
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- 週タイプ
  week_type VARCHAR(20) CHECK (week_type IN ('growth', 'stable', 'challenge', 'special')),

  -- セッション状態
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),

  -- メタデータ
  total_turns SMALLINT DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×週の組み合わせは一意
  UNIQUE (student_id, week_start_date),

  -- 週の日付妥当性
  CHECK (week_start_date <= week_end_date)
);

-- インデックス
CREATE INDEX idx_coaching_sessions_student ON public.coaching_sessions(student_id);
CREATE INDEX idx_coaching_sessions_week ON public.coaching_sessions(week_start_date DESC);

-- RLS有効化
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分のセッションのみ閲覧・編集
CREATE POLICY "Students can manage own coaching sessions"
  ON public.coaching_sessions FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どものセッションを閲覧のみ
CREATE POLICY "Parents can view children coaching sessions"
  ON public.coaching_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒のセッションを閲覧のみ
CREATE POLICY "Coaches can view assigned students coaching sessions"
  ON public.coaching_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all coaching sessions"
  ON public.coaching_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.coaching_sessions IS '週次振り返りコーチングセッション';
COMMENT ON COLUMN public.coaching_sessions.week_type IS '週タイプ: growth, stable, challenge, special';

-- ----------------------------------------------------------------------------
-- coaching_messages: コーチングメッセージ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,

  -- メッセージ内容
  role VARCHAR(20) NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,

  -- メタデータ
  turn_number SMALLINT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_coaching_messages_session ON public.coaching_messages(session_id);
CREATE INDEX idx_coaching_messages_turn ON public.coaching_messages(session_id, turn_number);

-- RLS有効化
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: セッションの所有者と同じRLSルールを継承
CREATE POLICY "Students can manage own coaching messages"
  ON public.coaching_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching messages"
  ON public.coaching_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.parent_child_relations pcr ON pcr.student_id = cs.student_id
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE cs.id = session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching messages"
  ON public.coaching_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.coach_student_relations csr ON csr.student_id = cs.student_id
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE cs.id = session_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching messages"
  ON public.coaching_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.coaching_messages IS 'コーチングセッション内のメッセージ (LINEライク対話)';
COMMENT ON COLUMN public.coaching_messages.role IS 'メッセージ送信者: assistant (AI), user (生徒)';

-- ----------------------------------------------------------------------------
-- weekly_analysis: 週次分析 (指導者向け)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_analysis (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 週の識別
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- AI生成分析内容
  strengths TEXT, -- 強み
  challenges TEXT, -- 課題
  advice TEXT, -- 具体的アドバイス

  -- メタデータ
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_batch BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×週の組み合わせは一意
  UNIQUE (student_id, week_start_date),

  -- 週の日付妥当性
  CHECK (week_start_date <= week_end_date)
);

-- インデックス
CREATE INDEX idx_weekly_analysis_student ON public.weekly_analysis(student_id);
CREATE INDEX idx_weekly_analysis_week ON public.weekly_analysis(week_start_date DESC);

-- RLS有効化
ALTER TABLE public.weekly_analysis ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 指導者は担当生徒の分析のみ閲覧
CREATE POLICY "Coaches can view assigned students weekly analysis"
  ON public.weekly_analysis FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: バッチ処理用 (Service Role Key使用)
-- Note: Service Role Keyでの実行時はRLSバイパス可能

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all weekly analysis"
  ON public.weekly_analysis FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.weekly_analysis IS '週次AI分析 (指導者向け)';
COMMENT ON COLUMN public.weekly_analysis.generated_by_batch IS 'バッチ処理で自動生成されたか';

-- ----------------------------------------------------------------------------
-- ai_cache: AIキャッシュ (コスト最適化)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id BIGSERIAL PRIMARY KEY,

  -- キャッシュキー (状況のハッシュ)
  cache_key VARCHAR(255) NOT NULL UNIQUE,

  -- キャッシュタイプ
  cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('encouragement', 'goal_commitment', 'reflection', 'weekly_analysis')),

  -- キャッシュ内容
  cached_content TEXT NOT NULL,

  -- メタデータ
  hit_count INTEGER NOT NULL DEFAULT 0,
  first_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_type ON public.ai_cache(cache_type);
CREATE INDEX idx_ai_cache_last_accessed ON public.ai_cache(last_accessed_at DESC);

-- RLS有効化 (管理者とバッチ処理のみアクセス)
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all ai cache"
  ON public.ai_cache FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.ai_cache IS 'AI生成コンテンツのキャッシュテーブル (コスト最適化)';
COMMENT ON COLUMN public.ai_cache.cache_key IS '状況のハッシュ値 (同一状況で再利用)';
COMMENT ON COLUMN public.ai_cache.hit_count IS 'キャッシュヒット回数';
-- ============================================================================
-- 07: 通知テーブル
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: アプリ内通知のテーブル

-- ----------------------------------------------------------------------------
-- notifications: 通知
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 通知タイプ
  notification_type VARCHAR(50) NOT NULL CHECK (
    notification_type IN (
      'new_encouragement',
      'goal_reminder',
      'reflection_available',
      'test_reminder',
      'achievement_unlocked'
    )
  ),

  -- 通知内容
  title VARCHAR(200) NOT NULL,
  body TEXT,

  -- 関連データ参照 (オプション)
  related_entity_type VARCHAR(50),
  related_entity_id BIGINT,

  -- 既読状態
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- メタデータ
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON public.notifications(sent_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- RLS有効化
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分の通知のみ閲覧・更新
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLSポリシー: システム (Service Role) が通知作成
-- Note: Service Role Keyでの実行時はRLSバイパス可能

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.notifications IS 'アプリ内通知';
COMMENT ON COLUMN public.notifications.related_entity_type IS '関連エンティティタイプ (例: encouragement_message, test_goal)';
COMMENT ON COLUMN public.notifications.related_entity_id IS '関連エンティティID';
COMMENT ON COLUMN public.notifications.expires_at IS '通知の有効期限 (過ぎたら非表示)';

-- ----------------------------------------------------------------------------
-- Helper function: 通知作成
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_notification_type VARCHAR,
  p_title VARCHAR,
  p_body TEXT DEFAULT NULL,
  p_related_entity_type VARCHAR DEFAULT NULL,
  p_related_entity_id BIGINT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_notification_id BIGINT;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    notification_type,
    title,
    body,
    related_entity_type,
    related_entity_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_related_entity_type,
    p_related_entity_id,
    p_expires_at
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS '通知作成ヘルパー関数 (Server Actionから呼び出し)';

-- ----------------------------------------------------------------------------
-- Trigger: 応援メッセージ受信時に通知作成
-- ----------------------------------------------------------------------------
-- Note: トリガー関数のみ定義し、実際のトリガー適用は20251004000009で実施
CREATE OR REPLACE FUNCTION notify_new_encouragement()
RETURNS TRIGGER AS $$
DECLARE
  v_student_user_id UUID;
BEGIN
  -- 生徒のuser_idを取得
  SELECT user_id INTO v_student_user_id
  FROM public.students
  WHERE id = NEW.student_id;

  -- 通知作成
  PERFORM create_notification(
    v_student_user_id,
    'new_encouragement',
    '新しい応援メッセージが届きました',
    NULL,
    'encouragement_message',
    NEW.id,
    NOW() + INTERVAL '30 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_new_encouragement IS '応援メッセージ受信時に通知を自動作成するトリガー関数';
-- ============================================================================
-- 08: 監査ログテーブル
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: システム監査ログのテーブルとトリガー

-- ----------------------------------------------------------------------------
-- audit_logs: 監査ログ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,

  -- 操作情報
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id BIGINT,

  -- 操作者
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role user_role,

  -- 変更内容
  old_data JSONB,
  new_data JSONB,

  -- メタデータ
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);

-- RLS有効化 (管理者のみアクセス)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.audit_logs IS 'システム監査ログ (全ての重要操作を記録)';
COMMENT ON COLUMN public.audit_logs.old_data IS '変更前のデータ (JSON形式)';
COMMENT ON COLUMN public.audit_logs.new_data IS '変更後のデータ (JSON形式)';

-- ----------------------------------------------------------------------------
-- Generic Audit Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- 現在のユーザー情報取得
  v_user_id := auth.uid();

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- 操作別にデータ設定
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  -- 監査ログ挿入
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    record_id,
    user_id,
    user_role,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    v_user_id,
    v_user_role,
    v_old_data,
    v_new_data
  );

  -- 操作続行
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_func IS '汎用監査トリガー関数 (重要テーブルに適用)';

-- ----------------------------------------------------------------------------
-- Apply Audit Triggers to Critical Tables
-- ----------------------------------------------------------------------------

-- profiles
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- students
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- parents
CREATE TRIGGER audit_parents
  AFTER INSERT OR UPDATE OR DELETE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- coaches
CREATE TRIGGER audit_coaches
  AFTER INSERT OR UPDATE OR DELETE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- admins
CREATE TRIGGER audit_admins
  AFTER INSERT OR UPDATE OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- invitation_codes
CREATE TRIGGER audit_invitation_codes
  AFTER INSERT OR UPDATE OR DELETE ON public.invitation_codes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- parent_child_relations
CREATE TRIGGER audit_parent_child_relations
  AFTER INSERT OR UPDATE OR DELETE ON public.parent_child_relations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- coach_student_relations
CREATE TRIGGER audit_coach_student_relations
  AFTER INSERT OR UPDATE OR DELETE ON public.coach_student_relations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- test_goals (目標変更履歴)
CREATE TRIGGER audit_test_goals
  AFTER INSERT OR UPDATE OR DELETE ON public.test_goals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- test_results (実績変更履歴)
CREATE TRIGGER audit_test_results
  AFTER INSERT OR UPDATE OR DELETE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ----------------------------------------------------------------------------
-- Data Retention: 古い監査ログの削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 1年以上前の監査ログを削除
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS '1年以上前の監査ログを削除 (バッチ処理で定期実行)';

-- ----------------------------------------------------------------------------
-- Data Retention: 古いAIキャッシュの削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 30日以上アクセスされていないキャッシュを削除
  DELETE FROM public.ai_cache
  WHERE last_accessed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_ai_cache IS '30日以上アクセスされていないAIキャッシュを削除';

-- ----------------------------------------------------------------------------
-- Data Retention: 古い週次分析の削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_weekly_analysis()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 6週間以上前の週次分析を削除
  DELETE FROM public.weekly_analysis
  WHERE week_start_date < NOW() - INTERVAL '6 weeks';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_weekly_analysis IS '6週間以上前の週次分析を削除';

-- ----------------------------------------------------------------------------
-- Data Retention: 古い通知の削除関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 有効期限切れまたは60日以上前の既読通知を削除
  DELETE FROM public.notifications
  WHERE (expires_at IS NOT NULL AND expires_at < NOW())
     OR (is_read = true AND read_at < NOW() - INTERVAL '60 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notifications IS '期限切れまたは古い既読通知を削除';

-- ----------------------------------------------------------------------------
-- Master Cleanup Function (バッチ処理で呼び出し)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION run_data_retention_cleanup()
RETURNS TABLE(
  cleanup_type VARCHAR,
  deleted_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT 'audit_logs'::VARCHAR, cleanup_old_audit_logs();
  RETURN QUERY SELECT 'ai_cache'::VARCHAR, cleanup_old_ai_cache();
  RETURN QUERY SELECT 'weekly_analysis'::VARCHAR, cleanup_old_weekly_analysis();
  RETURN QUERY SELECT 'notifications'::VARCHAR, cleanup_old_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION run_data_retention_cleanup IS 'データ保持ポリシーに基づく一括削除処理 (毎週日曜0時実行)';
-- ============================================================================
-- 09: トリガー適用
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 全テーブル作成後にトリガーを適用

-- ----------------------------------------------------------------------------
-- 応援メッセージ受信時の通知トリガー
-- ----------------------------------------------------------------------------
-- encouragement_messages テーブルへのトリガー適用
CREATE TRIGGER trigger_notify_new_encouragement
  AFTER INSERT ON public.encouragement_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_encouragement();

COMMENT ON TRIGGER trigger_notify_new_encouragement ON public.encouragement_messages
  IS '応援メッセージ受信時に自動的に通知を作成';

-- ----------------------------------------------------------------------------
-- 完了メッセージ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'トリガー適用完了';
  RAISE NOTICE '- trigger_notify_new_encouragement (encouragement_messages)';
END $$;
-- ============================================================================
-- 10: encouragement_messages テーブル拡張
-- ============================================================================
-- 作成日: 2025-10-06
-- 説明: 応援メッセージに応援種別と学習ログ参照カラムを追加
-- 対応タスク: P0-3 応援ログスキーマ拡張

-- ----------------------------------------------------------------------------
-- カラム追加
-- ----------------------------------------------------------------------------

-- 応援種別カラム追加 (quick: クイック応援, ai: AI応援, custom: カスタム応援)
ALTER TABLE public.encouragement_messages
ADD COLUMN IF NOT EXISTS support_type VARCHAR(20) CHECK (support_type IN ('quick', 'ai', 'custom'));

-- 学習ログ参照カラム追加 (応援対象の学習ログとの紐付け)
ALTER TABLE public.encouragement_messages
ADD COLUMN IF NOT EXISTS related_study_log_id BIGINT REFERENCES public.study_logs(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- インデックス追加
-- ----------------------------------------------------------------------------

-- 応援種別でのフィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_encouragement_support_type
  ON public.encouragement_messages(support_type);

-- 学習ログ参照用インデックス
CREATE INDEX IF NOT EXISTS idx_encouragement_study_log
  ON public.encouragement_messages(related_study_log_id);

-- 科目フィルター高速化用の複合インデックス (student_id + related_study_log_id)
CREATE INDEX IF NOT EXISTS idx_encouragement_student_log
  ON public.encouragement_messages(student_id, related_study_log_id);

-- ----------------------------------------------------------------------------
-- コメント追加
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.encouragement_messages.support_type IS '応援種別: quick(クイック応援), ai(AI応援), custom(カスタム応援)';
COMMENT ON COLUMN public.encouragement_messages.related_study_log_id IS '応援対象の学習ログID (科目フィルター用)';

-- ----------------------------------------------------------------------------
-- 既存データへのデフォルト値設定（マイグレーション実行時のみ）
-- ----------------------------------------------------------------------------

-- 既存レコードには 'custom' をデフォルト設定
UPDATE public.encouragement_messages
SET support_type = 'custom'
WHERE support_type IS NULL;

-- 今後は support_type を必須化
ALTER TABLE public.encouragement_messages
ALTER COLUMN support_type SET NOT NULL;
-- ============================================================================
-- 11: 認証フロー用スキーマ修正
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 認証・セットアップフロー実装に必要なカラム追加・制約変更

-- ----------------------------------------------------------------------------
-- profiles: セットアップ完了フラグ追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.setup_completed IS 'セットアップフロー完了フラグ';

-- ----------------------------------------------------------------------------
-- coaches: invitation_code を NULL 許可に変更
-- ----------------------------------------------------------------------------
-- テストユーザー作成時に招待コードなしでも作成できるようにする
ALTER TABLE public.coaches
ALTER COLUMN invitation_code DROP NOT NULL;

COMMENT ON COLUMN public.coaches.invitation_code IS '招待コード（NULL許可、テストユーザー用）';

-- ----------------------------------------------------------------------------
-- 完了メッセージ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '認証フロー用スキーマ修正完了';
  RAISE NOTICE '- profiles.setup_completed 追加';
  RAISE NOTICE '- coaches.invitation_code NULL許可に変更';
END $$;
-- ============================================================================
-- 12: 監査ログ record_id 型修正
-- ============================================================================
-- 作成日: 2025-10-06
-- 説明: UUID主キーを扱えるよう audit_logs.record_id を TEXT に変更

-- ----------------------------------------------------------------------------
-- record_id カラムを TEXT に変更
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs
ALTER COLUMN record_id TYPE TEXT USING record_id::text;

COMMENT ON COLUMN public.audit_logs.record_id IS '監査対象レコードのID (UUID/数値を文字列として保持)';

-- ----------------------------------------------------------------------------
-- 監査トリガー関数を再作成 (UUID対応)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_old_data JSONB;
  v_new_data JSONB;
  v_record_id TEXT;
BEGIN
  -- 現在のユーザー情報取得
  v_user_id := auth.uid();

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- 操作別データ設定
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(OLD)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(NEW)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
  ELSIF (TG_OP = 'INSERT') THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    -- id カラムが存在する場合はそれを使用、なければ NULL
    BEGIN
      v_record_id := (to_jsonb(NEW)->>'id')::text;
    EXCEPTION WHEN OTHERS THEN
      v_record_id := NULL;
    END;
  END IF;

  -- 監査ログ挿入
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    record_id,
    user_id,
    user_role,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    v_user_id,
    v_user_role,
    v_old_data,
    v_new_data
  );

  -- 操作続行
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_func IS '汎用監査トリガー関数 (UUID/数値主キー対応版)';

-- ----------------------------------------------------------------------------
-- 完了通知
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'audit_logs.record_id を TEXT 型に変更しました';
  RAISE NOTICE 'audit_trigger_func を UUID 対応に更新しました';
END $$;
-- ============================================================================
-- study_logs テーブルに study_date と reflection_text を追加
-- ============================================================================
-- 作成日: 2025-10-05
-- 説明: P1-1 学習記録保存機能の要件に対応
--       - study_date: 学習日 (デフォルトは今日)
--       - reflection_text: 振り返りコメント
--       - UNIQUE制約を (student_id, session_id, subject_id, study_content_type_id, study_date) に変更

-- ----------------------------------------------------------------------------
-- 1. 既存のUNIQUE制約を削除
-- ----------------------------------------------------------------------------
-- PostgreSQLは識別子を63文字に切り詰めるため、実際の制約名はこちら
ALTER TABLE public.study_logs
  DROP CONSTRAINT IF EXISTS study_logs_student_id_session_id_subject_id_study_content_t_key;

-- ----------------------------------------------------------------------------
-- 2. study_date カラムを追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.study_logs
  ADD COLUMN IF NOT EXISTS study_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- ----------------------------------------------------------------------------
-- 3. reflection_text カラムを追加
-- ----------------------------------------------------------------------------
ALTER TABLE public.study_logs
  ADD COLUMN IF NOT EXISTS reflection_text TEXT;

-- ----------------------------------------------------------------------------
-- 4. 新しいUNIQUE制約を追加 (study_date を含む)
-- ----------------------------------------------------------------------------
-- 同じ生徒×学習回×科目×学習内容×学習日の組み合わせは一意
ALTER TABLE public.study_logs
  ADD CONSTRAINT study_logs_unique_per_date
    UNIQUE (student_id, session_id, subject_id, study_content_type_id, study_date);

-- ----------------------------------------------------------------------------
-- 5. study_date 用のインデックスを追加
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_study_logs_study_date ON public.study_logs(study_date DESC);

-- ----------------------------------------------------------------------------
-- コメント更新
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.study_logs.study_date IS '学習日 (YYYY-MM-DD形式)';
COMMENT ON COLUMN public.study_logs.reflection_text IS '振り返りコメント (オプション)';
-- ============================================================================
-- 20251006000013_update_rls_policies.sql
-- 説明: Phase 0 RLS 詳細ポリシー整備および WITH CHECK 追加
-- ============================================================================

-- ================================
-- parent_child_relations
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_child_relations;
  DROP POLICY IF EXISTS "Students can view own parent relations" ON public.parent_child_relations;
  DROP POLICY IF EXISTS "Admins can manage all parent-child relations" ON public.parent_child_relations;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all parent-child relations"
  ON public.parent_child_relations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coach_student_relations
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coaches can view own students relations" ON public.coach_student_relations;
  DROP POLICY IF EXISTS "Students can view own coaches relations" ON public.coach_student_relations;
  DROP POLICY IF EXISTS "Admins can manage all coach-student relations" ON public.coach_student_relations;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Coaches can view own students relations"
  ON public.coach_student_relations
  FOR SELECT
  TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM public.coaches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own coaches relations"
  ON public.coach_student_relations
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coach-student relations"
  ON public.coach_student_relations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- study_logs
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Parents can view children study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Coaches can view assigned students study logs" ON public.study_logs;
  DROP POLICY IF EXISTS "Admins can manage all study logs" ON public.study_logs;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own study logs"
  ON public.study_logs
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children study logs"
  ON public.study_logs
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students study logs"
  ON public.study_logs
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all study logs"
  ON public.study_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- encouragement_messages
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can view and mark read own messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can view own encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can update read status on own messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Students can update read status on own encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can view children messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can view children encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can send messages to children" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can manage own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can delete own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Parents can send encouragement messages to their children" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can send messages to assigned students" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can manage own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can delete own sent encouragement messages" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Coaches can send encouragement messages to assigned students" ON public.encouragement_messages;
  DROP POLICY IF EXISTS "Admins can manage all encouragement messages" ON public.encouragement_messages;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can view own encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update read status on own encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage own sent encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own sent encouragement messages"
  ON public.encouragement_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can send encouragement messages to their children"
  ON public.encouragement_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students encouragement messages"
  ON public.encouragement_messages
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage own sent encouragement messages"
  ON public.encouragement_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own sent encouragement messages"
  ON public.encouragement_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can send encouragement messages to assigned students"
  ON public.encouragement_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all encouragement messages"
  ON public.encouragement_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_goals
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Parents can view children test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Coaches can view assigned students test goals" ON public.test_goals;
  DROP POLICY IF EXISTS "Admins can manage all test goals" ON public.test_goals;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own test goals"
  ON public.test_goals
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children test goals"
  ON public.test_goals
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students test goals"
  ON public.test_goals
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all test goals"
  ON public.test_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_results
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own test results" ON public.test_results;
  DROP POLICY IF EXISTS "Parents can view children test results" ON public.test_results;
  DROP POLICY IF EXISTS "Coaches can view assigned students test results" ON public.test_results;
  DROP POLICY IF EXISTS "Admins can manage all test results" ON public.test_results;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own test results"
  ON public.test_results
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children test results"
  ON public.test_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students test results"
  ON public.test_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all test results"
  ON public.test_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coaching_sessions
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Parents can view children coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Coaches can view assigned students coaching sessions" ON public.coaching_sessions;
  DROP POLICY IF EXISTS "Admins can manage all coaching sessions" ON public.coaching_sessions;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own coaching sessions"
  ON public.coaching_sessions
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching sessions"
  ON public.coaching_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- coaching_messages
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can manage own coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Parents can view children coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Coaches can view assigned students coaching messages" ON public.coaching_messages;
  DROP POLICY IF EXISTS "Admins can manage all coaching messages" ON public.coaching_messages;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Students can manage own coaching messages"
  ON public.coaching_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.parent_child_relations pcr ON pcr.student_id = cs.student_id
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE cs.id = session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching messages"
  ON public.coaching_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      JOIN public.coach_student_relations csr ON csr.student_id = cs.student_id
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE cs.id = session_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching messages"
  ON public.coaching_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- weekly_analysis
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coaches can view assigned students weekly analysis" ON public.weekly_analysis;
  DROP POLICY IF EXISTS "Admins can manage all weekly analysis" ON public.weekly_analysis;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Coaches can view assigned students weekly analysis"
  ON public.weekly_analysis
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all weekly analysis"
  ON public.weekly_analysis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- notifications
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================
-- test_types and test_schedules
-- ================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "All authenticated users can view test types" ON public.test_types;
  DROP POLICY IF EXISTS "Admins can manage test types" ON public.test_types;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "All authenticated users can view test types"
  ON public.test_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test types"
  ON public.test_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "All authenticated users can view test schedules" ON public.test_schedules;
  DROP POLICY IF EXISTS "Admins can manage test schedules" ON public.test_schedules;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "All authenticated users can view test schedules"
  ON public.test_schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test schedules"
  ON public.test_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
-- ============================================================================
-- P3-1: ゴールナビ用にtest_goalsテーブルを拡張
-- ============================================================================
-- 作成日: 2025-10-06 07:00
-- 説明: コース・組の目標設定をサポート

-- test_goalsテーブルにカラム追加
ALTER TABLE public.test_goals
  ADD COLUMN IF NOT EXISTS target_course VARCHAR(1) CHECK (target_course IN ('S', 'C', 'B', 'A')),
  ADD COLUMN IF NOT EXISTS target_class SMALLINT CHECK (target_class >= 1 AND target_class <= 40),
  ADD COLUMN IF NOT EXISTS goal_thoughts TEXT;

-- commitment_textをgoal_thoughtsとして使用する場合の移行
-- （既存データがあればコピー）
UPDATE public.test_goals
SET goal_thoughts = commitment_text
WHERE goal_thoughts IS NULL AND commitment_text IS NOT NULL;

COMMENT ON COLUMN public.test_goals.target_course IS '目標コース（S/C/B/A）';
COMMENT ON COLUMN public.test_goals.target_class IS '目標の組（1〜40）';
COMMENT ON COLUMN public.test_goals.goal_thoughts IS 'AI対話から生成された「今回の思い」';
-- ============================================================================
-- P3-2: リフレクト用にcoaching_sessionsテーブルを拡張
-- ============================================================================
-- 作成日: 2025-10-06 08:00
-- 説明: 週次振り返りのサマリー保存カラムを追加

-- coaching_sessionsにサマリーカラムを追加
ALTER TABLE public.coaching_sessions
  ADD COLUMN IF NOT EXISTS summary_text TEXT;

COMMENT ON COLUMN public.coaching_sessions.summary_text IS 'AI生成された週次振り返りサマリー';
-- ============================================================================
-- 20251007000001_add_sender_profile_rpc.sql
-- 説明: 応援メッセージ送信者プロフィール取得用のRPC追加
-- ============================================================================

-- ============================================================================
-- 送信者プロフィール公開ビュー (display_name, avatar_url のみ)
-- ============================================================================
CREATE OR REPLACE VIEW public.public_sender_profiles AS
SELECT
  id,
  display_name,
  avatar_url
FROM public.profiles;

-- ============================================================================
-- RPC: 応援メッセージの送信者プロフィールを取得
-- ============================================================================
-- この関数は SECURITY DEFINER で実行され、RLSをバイパスして
-- 送信者の display_name と avatar_url のみを安全に返します
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profiles(sender_ids UUID[])
RETURNS TABLE (
  id UUID,
  display_name VARCHAR(100),
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(sender_ids);
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION public.get_sender_profiles(UUID[]) TO authenticated;

-- ============================================================================
-- RPC: 単一の送信者プロフィールを取得 (簡易版)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profile(sender_id UUID)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR(100),
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = sender_id;
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION public.get_sender_profile(UUID) TO authenticated;

-- ============================================================================
-- コメント追加
-- ============================================================================
COMMENT ON FUNCTION public.get_sender_profiles(UUID[]) IS
'応援メッセージ送信者の公開プロフィール情報（display_name, avatar_url）を安全に取得する。SECURITY DEFINER により RLS をバイパス。';

COMMENT ON FUNCTION public.get_sender_profile(UUID) IS
'単一の応援メッセージ送信者の公開プロフィール情報を取得する。SECURITY DEFINER により RLS をバイパス。';
-- Fix DELETE RLS policies for encouragement_messages
-- Issue: Current policies allow deletion even when student is not assigned to parent/coach
-- Root cause: The student_id check in the subquery may be returning true incorrectly

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Parents can delete own sent encouragement messages" ON public.encouragement_messages;
DROP POLICY IF EXISTS "Coaches can delete own sent encouragement messages" ON public.encouragement_messages;

-- Recreate DELETE policy for parents with explicit student assignment check
CREATE POLICY "Parents can delete own sent encouragement messages"
ON public.encouragement_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  AND sender_role = 'parent'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.parent_child_relations pcr
    JOIN public.parents p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
    AND pcr.student_id = encouragement_messages.student_id
  )
);

-- Recreate DELETE policy for coaches with explicit student assignment check
CREATE POLICY "Coaches can delete own sent encouragement messages"
ON public.encouragement_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  AND sender_role = 'coach'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.coach_student_relations csr
    JOIN public.coaches c ON c.id = csr.coach_id
    WHERE c.user_id = auth.uid()
    AND csr.student_id = encouragement_messages.student_id
  )
);
-- ============================================================================
-- Add type_category column to test_types table
-- ============================================================================
-- 作成日: 2025-10-07
-- 説明: test_typesテーブルにtype_categoryカラムを追加し、既存データを更新

-- type_categoryカラムを追加
ALTER TABLE public.test_types
ADD COLUMN IF NOT EXISTS type_category VARCHAR(50);

-- 既存データに対してtype_categoryを設定
-- 小5の組分けテスト
UPDATE public.test_types
SET type_category = 'kumibun'
WHERE grade = 5 AND name LIKE '%組分け%';

-- 小6の合不合判定テスト
UPDATE public.test_types
SET type_category = 'goufugou'
WHERE grade = 6 AND name LIKE '%合不合%';

-- 今後の挿入に対してNOT NULL制約を追加（既存データ更新後）
-- まずは nullable で追加し、データ移行後に NOT NULL 制約を適用
ALTER TABLE public.test_types
ALTER COLUMN type_category SET NOT NULL;

-- コメント追加
COMMENT ON COLUMN public.test_types.type_category IS 'テストカテゴリ (kumibun: 組分けテスト, goufugou: 合不合判定テスト)';
-- システム設定テーブルの作成
-- 管理者がアプリケーション全体の設定を管理するためのKey-Valueストア

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー: 管理者のみ閲覧・編集可能
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者はシステム設定を閲覧可能"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "管理者はシステム設定を編集可能"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- 初期設定データの挿入
INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('weekly_analysis_enabled', 'true'),
  ('encouragement_enabled', 'true'),
  ('reflection_enabled', 'true'),
  ('audit_log_retention_days', '365'),
  ('student_data_retention_days', '730')
ON CONFLICT (key) DO NOTHING;

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- コメント
COMMENT ON TABLE system_settings IS 'システム全体の設定を管理するKey-Valueストア';
COMMENT ON COLUMN system_settings.key IS '設定キー（一意）';
COMMENT ON COLUMN system_settings.value IS '設定値（文字列形式）';
COMMENT ON COLUMN system_settings.updated_at IS '最終更新日時';
COMMENT ON COLUMN system_settings.created_at IS '作成日時';
-- test_resultsテーブルにresult_courseとresult_classカラムを追加
-- 簡易的な結果入力（コース・組のみ）に対応

ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS result_course TEXT,
ADD COLUMN IF NOT EXISTS result_class SMALLINT CHECK (result_class >= 1 AND result_class <= 40);

-- コメント追加
COMMENT ON COLUMN public.test_results.result_course IS '結果のコース（S/C/B/A）';
COMMENT ON COLUMN public.test_results.result_class IS '結果の組（1-40）';
-- Fix study_date to use JST timezone instead of UTC
-- This ensures that logs created after midnight JST are correctly dated

-- Update the default value for study_date column to use JST
ALTER TABLE study_logs
  ALTER COLUMN study_date
  SET DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date;

-- Update existing records where logged_at (JST) and study_date are mismatched
-- For example, if logged_at is 2025-10-15 00:36 JST but study_date is 2025-10-14
UPDATE study_logs
SET study_date = (logged_at AT TIME ZONE 'Asia/Tokyo')::date
WHERE study_date != (logged_at AT TIME ZONE 'Asia/Tokyo')::date;

-- Add comment explaining the column
COMMENT ON COLUMN study_logs.study_date IS 'Study date in JST timezone (Asia/Tokyo). Automatically set based on logged_at timestamp converted to JST.';
-- ============================================================================
-- プロフィール自動作成トリガー
-- ============================================================================
-- 新しいユーザーがauth.usersに作成されたときに、自動的にpublic.profilesを作成する

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成（既存の場合は削除して再作成）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- コメント
COMMENT ON FUNCTION public.handle_new_user() IS 'auth.usersに新規ユーザーが作成されたときにpublic.profilesを自動作成';
-- ============================================================================
-- 保護者・子ども同時登録関数（トランザクション対応）
-- ============================================================================

-- 保護者登録用の型定義
CREATE TYPE parent_child_registration_result AS (
  parent_id BIGINT,
  student_ids BIGINT[]
);

-- 保護者・子ども同時登録関数
CREATE OR REPLACE FUNCTION register_parent_with_children(
  p_parent_user_id UUID,
  p_parent_full_name VARCHAR(100),
  p_parent_furigana VARCHAR(100),
  p_children JSONB -- [{ user_id, full_name, furigana, login_id, grade }]
)
RETURNS parent_child_registration_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id BIGINT;
  v_student_id BIGINT;
  v_student_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_child JSONB;
  v_result parent_child_registration_result;
BEGIN
  -- 1. プロフィールが存在するか確認（トリガーで作成されているはず）
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_parent_user_id) THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', p_parent_user_id;
  END IF;

  -- 2. 保護者レコード作成
  INSERT INTO public.parents (user_id, full_name, furigana)
  VALUES (p_parent_user_id, p_parent_full_name, p_parent_furigana)
  RETURNING id INTO v_parent_id;

  -- 3. 各子どものレコード作成とリレーション作成
  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children)
  LOOP
    -- 子どものプロフィール確認
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = (v_child->>'user_id')::UUID) THEN
      RAISE EXCEPTION 'Profile not found for child user_id: %', v_child->>'user_id';
    END IF;

    -- login_id重複チェック
    IF EXISTS (SELECT 1 FROM public.students WHERE login_id = v_child->>'login_id') THEN
      RAISE EXCEPTION 'Login ID already exists: %', v_child->>'login_id';
    END IF;

    -- 生徒レコード作成
    INSERT INTO public.students (user_id, full_name, furigana, login_id, grade)
    VALUES (
      (v_child->>'user_id')::UUID,
      v_child->>'full_name',
      v_child->>'furigana',
      v_child->>'login_id',
      (v_child->>'grade')::SMALLINT
    )
    RETURNING id INTO v_student_id;

    -- 配列に追加
    v_student_ids := array_append(v_student_ids, v_student_id);

    -- 親子関係作成
    INSERT INTO public.parent_child_relations (parent_id, student_id)
    VALUES (v_parent_id, v_student_id);
  END LOOP;

  -- 結果を返す
  v_result.parent_id := v_parent_id;
  v_result.student_ids := v_student_ids;
  RETURN v_result;
END;
$$;

-- コメント
COMMENT ON FUNCTION register_parent_with_children IS '保護者と子どもを原子的に登録する関数。エラー時は自動的にロールバックされる。';
-- ============================================================================
-- プロフィール自動作成トリガー修正（エラーハンドリング強化）
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- ロールの取得（デフォルト: student）
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'student'::user_role;
    RAISE WARNING 'Failed to parse role from metadata, using default: student. Error: %', SQLERRM;
  END;

  -- プロフィールの作成
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- エラーをログに出力して、ユーザー作成を失敗させる
  RAISE EXCEPTION 'Failed to create profile for user %: %', NEW.id, SQLERRM;
END;
$$;

-- トリガー再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- コメント
COMMENT ON FUNCTION public.handle_new_user() IS 'auth.usersに新規ユーザーが作成されたときにpublic.profilesを自動作成（エラーハンドリング強化版）';
-- プロフィールカスタマイズ機能用のカラム追加
-- nickname, avatar_id, theme_color を追加

-- 1. 新しいカラムを追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6';

-- 2. 既存データの移行（display_name → nickname）
UPDATE profiles
SET nickname = display_name
WHERE nickname IS NULL AND display_name IS NOT NULL;

-- 3. nickname を NOT NULL に設定（デフォルト値付き）
ALTER TABLE profiles
  ALTER COLUMN nickname SET DEFAULT 'ユーザー',
  ALTER COLUMN nickname SET NOT NULL;

-- 4. avatar_id を NOT NULL に設定（ロール別デフォルト値）
-- まず、既存レコードにデフォルト値を設定
UPDATE profiles
SET avatar_id = CASE
  WHEN role = 'student' THEN 'student1'
  WHEN role = 'parent' THEN 'parent1'
  WHEN role = 'coach' THEN 'parent1'
  WHEN role = 'admin' THEN 'parent1'
  ELSE 'student1'
END
WHERE avatar_id IS NULL;

-- avatar_id を NOT NULL に設定
ALTER TABLE profiles
  ALTER COLUMN avatar_id SET NOT NULL;

-- 5. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_id ON profiles(avatar_id);

-- 6. コメントを追加
COMMENT ON COLUMN profiles.nickname IS 'ユーザーのニックネーム（1〜10文字）';
COMMENT ON COLUMN profiles.avatar_id IS 'アバターID（student1〜6, parent1〜6など）';
COMMENT ON COLUMN profiles.theme_color IS 'テーマカラー（HEX形式）';

-- 7. バリデーション用の制約を追加
ALTER TABLE profiles
  ADD CONSTRAINT nickname_length_check CHECK (char_length(nickname) >= 1 AND char_length(nickname) <= 10),
  ADD CONSTRAINT theme_color_format_check CHECK (theme_color ~ '^#[0-9A-Fa-f]{6}$');
-- プロフィールトリガーを修正してavatar_id, nickname, theme_colorを自動設定

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role user_role;
  default_avatar_id TEXT;
  random_suffix TEXT;
BEGIN
  -- ロールの取得（デフォルト: student）
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'student'::user_role;
    RAISE WARNING 'Failed to parse role from metadata, using default: student. Error: %', SQLERRM;
  END;

  -- ロール別のデフォルトavatar_idを設定
  CASE user_role
    WHEN 'student' THEN default_avatar_id := 'student1';
    WHEN 'parent' THEN default_avatar_id := 'parent1';
    WHEN 'coach' THEN default_avatar_id := 'parent1';
    WHEN 'admin' THEN default_avatar_id := 'parent1';
    ELSE default_avatar_id := 'student1';
  END CASE;

  -- ランダムな4桁数字を生成
  random_suffix := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- プロフィールの作成
  INSERT INTO public.profiles (
    id,
    role,
    display_name,
    nickname,
    avatar_id,
    theme_color
  )
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    CASE user_role
      WHEN 'student' THEN 'ユーザー' || random_suffix
      WHEN 'parent' THEN '保護者' || random_suffix
      ELSE '指導者' || random_suffix
    END,
    default_avatar_id,
    '#3B82F6'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- エラーをログに出力して、ユーザー作成を失敗させる
  RAISE EXCEPTION 'Failed to create profile for user %: %', NEW.id, SQLERRM;
END;
$function$;
