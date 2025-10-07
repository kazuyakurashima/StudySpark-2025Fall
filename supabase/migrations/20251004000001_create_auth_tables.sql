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
